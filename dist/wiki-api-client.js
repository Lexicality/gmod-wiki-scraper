import got from "got";
export class WikiApiClient {
    static wikiUrl = "https://wiki.facepunch.com";
    static wikiApiUrl = `${WikiApiClient.wikiUrl}/api`;
    async retrievePage(pageUrl) {
        // Remove '/' or '/gmod/' prefixes
        let pageUrlNormalized = pageUrl.startsWith("/")
            ? pageUrl.substring(1)
            : pageUrl;
        pageUrlNormalized = pageUrlNormalized.startsWith("gmod/")
            ? pageUrlNormalized.substring(5)
            : pageUrlNormalized;
        const response = await got(`${WikiApiClient.wikiUrl}/gmod/${pageUrlNormalized}?format=json`).json();
        if (response.title === "Page Not Found") {
            throw new Error(`Page with url '${pageUrl}' was not found`);
        }
        return {
            content: response.markup,
            title: response.title,
        };
    }
    async renderText(text) {
        const body = { text: text, realm: "gmod" };
        const response = await got(`${WikiApiClient.wikiApiUrl}/page/preview`, {
            method: "POST",
            json: body,
        }).json();
        return response;
    }
}
