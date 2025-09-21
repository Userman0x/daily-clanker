import json
import requests
import os

def categorize_article_with_ollama(article, categories, ollama_url='http://localhost:11434/api/generate', model='mistral:latest'):
    """
    Uses Ollama to categorize a single article based on its title and content.
    """
    prompt = f"""
    You are a professional news editor for a satirical website. All articles are satirical in nature. Your task is to read the following article and assign it to one of these six categories: Finance, Business, Tech, Crypto, Culture, or Opinion.

    The category must be a single word from the list provided. Do not provide any additional text or explanation, just the category name.

    Use these rules to guide your decision:
    - **Opinion:** Use this for articles that are satirical about politics, government, or social commentary. This category is for pieces that mock a specific political stance, policy, or public figure.
    - **Culture:** This is for satirical articles about sports, gaming, entertainment, and general lifestyle topics. This is the catch-all for anything that is not directly political, financial, or technological.
    - **Tech:** This is for satirical articles about technology, gadgets, software, AI, or digital infrastructure.
    - **Finance:** This is for satirical articles about traditional financial markets, banking, and investment.
    - **Business:** This is for satirical articles about companies, corporate news, startups, and entrepreneurship.
    - **Crypto:** This is for satirical articles about digital currencies, blockchain, and decentralized finance (DeFi).

    Article Title: {article.get('title', '')}
    Article Content: {article.get('content', '')}
    
    Category:
    """

    try:
        response = requests.post(
            ollama_url,
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.1
                }
            },
            timeout=60
        )
        response.raise_for_status()
        
        response_json = response.json()
        category_text = response_json['response'].strip()
        
        if category_text in categories:
            return category_text
        else:
            print(f"Ollama returned an invalid category: '{category_text}'. Falling back to 'Opinion'.")
            return 'Opinion'
            
    except requests.exceptions.RequestException as e:
        print(f"Error connecting to Ollama: {e}")
        print("Please ensure Ollama is installed and the model is running.")
        return 'Opinion'

def main():
    input_file = 'articles.json'
    output_file = 'articles_organized_by_ollama.json'
    
    categories = ['Finance', 'Business', 'Tech', 'Crypto', 'Culture', 'Opinion']

    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            articles = json.load(f)
    except FileNotFoundError:
        print(f"Error: The file '{input_file}' was not found.")
        return

    updated_articles = []
    
    print("Starting categorization with Ollama. This may take a while...")

    for i, article in enumerate(articles):
        print(f"Processing article {i+1}/{len(articles)}: {article.get('title', 'No Title')}")
        
        new_category = categorize_article_with_ollama(article, categories)
        
        article['category'] = new_category
        updated_articles.append(article)
        
        print(f"  -> Assigned category: {new_category}")
    
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(updated_articles, f, indent=4)
        print(f"\nSuccessfully created a new file with organized articles: '{output_file}'.")
    except IOError:
        print(f"Error: Could not write to the file '{output_file}'.")

if __name__ == "__main__":
    main()
