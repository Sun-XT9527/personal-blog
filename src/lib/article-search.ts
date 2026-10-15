import type {Category} from './categories';

export interface SearchArticle {id:string;category:Category;text:string}

export function matchingArticles(articles:SearchArticle[],query:string,category:Category|''):SearchArticle[] {
  const term=query.toLocaleLowerCase().trim();
  return articles.filter(article=>(!category||article.category===category)&&article.text.toLocaleLowerCase().includes(term));
}
