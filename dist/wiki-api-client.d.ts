import { PagePreviewResponse, WikiPage } from "./types.js";
export declare class WikiApiClient {
    static readonly wikiUrl = "https://wiki.facepunch.com";
    static readonly wikiApiUrl: string;
    retrievePage(pageUrl: string): Promise<WikiPage>;
    renderText(text: string): Promise<PagePreviewResponse>;
}
