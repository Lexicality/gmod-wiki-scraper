import * as cheerio from "cheerio";
import { SingleBar, Presets } from "cli-progress";
import pLimit from "p-limit";
import logger from "./logger.js";
import { isTagElement } from "./cheerio.js";
export class WikiScraper {
    wikiApiClient;
    static limit = pLimit(8);
    progressBar = new SingleBar({}, Presets.shades_classic);
    constructor(wikiApiClient) {
        this.wikiApiClient = wikiApiClient;
    }
    async getGlobalFunctions() {
        const globalFunctionPageUrls = await this.getPagesInCategory("Global");
        this.progressBar.start(globalFunctionPageUrls.length, 0);
        const globalFunctionPages = await Promise.all(globalFunctionPageUrls.map(async (pageUrl) => {
            const page = await WikiScraper.limit(() => this.wikiApiClient.retrievePage(pageUrl));
            this.progressBar.increment();
            return page;
        }));
        this.progressBar.stop();
        const globalFunctions = [];
        globalFunctionPages.forEach((globalFunctionPage) => {
            if (this.isFunctionPage(globalFunctionPage.content)) {
                const globalFunction = this.parseFunctionPage(globalFunctionPage.content);
                globalFunctions.push(globalFunction);
            }
            else {
                logger.warn(`Unknown page type encountered on page '${globalFunctionPage.title}'`);
            }
        });
        return globalFunctions;
    }
    async getClasses() {
        const classPageUrls = await this.getPagesInCategory("classfunc");
        this.progressBar.start(classPageUrls.length, 0);
        const classPages = await Promise.all(classPageUrls.map(async (pageUrl) => {
            const page = await WikiScraper.limit(() => this.wikiApiClient.retrievePage(pageUrl));
            this.progressBar.increment();
            return page;
        }));
        this.progressBar.stop();
        return this.buildClasses(classPages);
    }
    async getLibraries() {
        const libraryPageUrls = await this.getPagesInCategory("libraryfunc");
        this.progressBar.start(libraryPageUrls.length, 0);
        const libraryPages = await Promise.all(libraryPageUrls.map(async (pageUrl) => {
            const page = await WikiScraper.limit(() => this.wikiApiClient.retrievePage(pageUrl));
            this.progressBar.increment();
            return page;
        }));
        this.progressBar.stop();
        return this.buildClasses(libraryPages);
    }
    async getHooks() {
        const hookPageUrls = await this.getPagesInCategory("hook", ".*:");
        this.progressBar.start(hookPageUrls.length, 0);
        const hookPages = await Promise.all(hookPageUrls.map(async (pageUrl) => {
            const page = await WikiScraper.limit(() => this.wikiApiClient.retrievePage(pageUrl));
            this.progressBar.increment();
            return page;
        }));
        this.progressBar.stop();
        return this.buildClasses(hookPages);
    }
    async getPanels() {
        const panelPageUrls = await this.getPagesInCategory("panelfunc");
        this.progressBar.start(panelPageUrls.length, 0);
        const panelPages = await Promise.all(panelPageUrls.map(async (pageUrl) => {
            const page = await WikiScraper.limit(() => this.wikiApiClient.retrievePage(pageUrl));
            this.progressBar.increment();
            return page;
        }));
        this.progressBar.stop();
        return this.buildClasses(panelPages);
    }
    async getEnums() {
        const enumPageUrls = await this.getPagesInCategory("enum");
        this.progressBar.start(enumPageUrls.length, 0);
        const enumPages = await Promise.all(enumPageUrls.map(async (pageUrl) => {
            const page = await WikiScraper.limit(() => this.wikiApiClient.retrievePage(pageUrl));
            this.progressBar.increment();
            return page;
        }));
        this.progressBar.stop();
        const enums = [];
        enumPages.forEach((enumPage) => {
            if (this.isEnumPage(enumPage.content)) {
                const _enum = this.parseEnumPage(enumPage.content);
                _enum.name = enumPage.title;
                enums.push(_enum);
            }
            else {
                logger.warn(`Unknown page type encountered on page '${enumPage.title}'`);
            }
        });
        return enums;
    }
    async getStructs() {
        const structPageUrls = await this.getPagesInCategory("struct");
        this.progressBar.start(structPageUrls.length, 0);
        const structPages = await Promise.all(structPageUrls.map(async (pageUrl) => {
            const page = await WikiScraper.limit(() => this.wikiApiClient.retrievePage(pageUrl));
            this.progressBar.increment();
            return page;
        }));
        this.progressBar.stop();
        const structs = [];
        structPages.forEach((structPage) => {
            if (this.isStructPage(structPage.content)) {
                const struct = this.parseStructPage(structPage.content);
                struct.name = structPage.title;
                structs.push(struct);
            }
            else {
                logger.warn(`Unknown page type encountered on page '${structPage.title}'`);
            }
        });
        return structs;
    }
    async getPagesInCategory(category, filter = "") {
        const response = await this.wikiApiClient.renderText(`<pagelist category="${category}" filter="${filter}"></pagelist>`);
        if (!response.html || response.html === "") {
            throw new Error(`Could not get pages in category '${category}' with filter '${filter}'`);
        }
        const pageUrls = [];
        const $ = this.parseContent(response.html);
        $("ul > li > a").each((i, element) => {
            if (element.type !== "tag") {
                return;
            }
            pageUrls.push(element.attribs.href);
        });
        return pageUrls;
    }
    buildClasses(wikiPages) {
        const classes = new Map();
        wikiPages.forEach((wikiPage) => {
            // Examples:
            // ContentIcon
            // ContentIcon:GetColor
            // achievements
            // achievements.BalloonPopped
            const className = wikiPage.title.includes(":")
                ? wikiPage.title.split(":")[0]
                : wikiPage.title.includes(".")
                    ? wikiPage.title.split(".")[0]
                    : wikiPage.title;
            const _class = classes.get(className) ?? { name: className };
            if (this.isPanelPage(wikiPage.content)) {
                const panel = this.parsePanelPage(wikiPage.content);
                _class.parent = panel.parent;
                if (panel.description) {
                    _class.description = panel.description;
                }
            }
            else if (this.isTypePage(wikiPage.content)) {
                const type = this.parseTypePage(wikiPage.content);
                if (type.description) {
                    _class.description = type.description;
                }
            }
            else if (this.isClassFieldPage(wikiPage.content)) {
                const field = this.parseFieldPage(wikiPage.content);
                _class.fields = _class.fields ?? [];
                _class.fields.push(field);
            }
            else if (this.isFunctionPage(wikiPage.content)) {
                const _function = this.parseFunctionPage(wikiPage.content);
                _class.functions = _class.functions ?? [];
                _class.functions.push(_function);
            }
            else {
                logger.warn(`Unknown page type encountered on page '${wikiPage.title}'`);
            }
            classes.set(className, _class);
        });
        return Array.from(classes.values());
    }
    parseFieldPage(pageContent) {
        const $ = this.parseContent(pageContent);
        const name = $("function").attr().name;
        const parent = $("function").attr().parent;
        let rawDescription = $("function > description").html();
        const $sourceFile = $("function > file");
        const realmsRaw = this.trimMultiLineString($("function > realm").text());
        const realms = this.parseRealms(realmsRaw);
        const typeEl = $("function > rets")
            .children()
            .filter((_, el) => el.type == "tag")
            .first();
        const type = typeEl.attr("type") ?? "nil";
        // Currently all the fields define both a normal description and a
        // return description, but since the return description seems to mostly
        // be useless, only pick it if there is no real description
        if (!this.isValidDescription(rawDescription)) {
            rawDescription = $(typeEl).html();
        }
        let description = undefined;
        if (this.isValidDescription(rawDescription)) {
            description = this.trimMultiLineString(rawDescription);
        }
        return {
            name,
            type,
            description,
            parent,
            realms,
            source: this.parseSourceFile($sourceFile)
        };
    }
    parseFunctionPage(pageContent) {
        const $ = this.parseContent(pageContent);
        const name = $("function").attr().name;
        const parent = $("function").attr().parent;
        const description = $("function > description").html();
        const $sourceFile = $("function > file");
        const realmsRaw = this.trimMultiLineString($("function > realm").text());
        const realms = this.parseRealms(realmsRaw);
        const args = [];
        const overloadedArgs = [];
        const returnValues = [];
        const [argsElement, ...overloadArgsElements] = $("function > args");
        if (argsElement != null) {
            args.push(...this.parseFunctionArguments(argsElement));
        }
        if (overloadArgsElements.length > 0) {
            for (const overloadArgsElement of overloadArgsElements) {
                overloadedArgs.push(this.parseFunctionArguments(overloadArgsElement));
            }
        }
        $("function > rets")
            .children()
            .each((i, element) => {
            if (element.type !== "tag") {
                return;
            }
            const description = $(element).html();
            const name = element.attribs.name;
            const returnValue = {
                type: element.attribs.type,
            };
            if (name && name !== "") {
                returnValue.name = name;
            }
            if (description && description !== "") {
                returnValue.description = this.trimMultiLineString(description);
            }
            returnValues.push(returnValue);
        });
        const _function = {
            name: name,
            parent: parent,
            realms: realms,
            source: this.parseSourceFile($sourceFile)
        };
        if (description && description !== "") {
            _function.description = this.trimMultiLineString(description);
        }
        if (args.length > 0) {
            _function.arguments = args;
        }
        if (returnValues.length > 0) {
            _function.returnValues = returnValues;
        }
        if (overloadedArgs.length > 0) {
            _function.overloads = overloadedArgs.map((args) => {
                return {
                    arguments: args,
                    returnValues: returnValues.length > 0 ? returnValues : undefined,
                };
            });
        }
        return _function;
    }
    parseSourceFile($sourceFile) {
        if ($sourceFile.length == 0) {
            return undefined;
        }
        const file = $sourceFile.text();
        const line = $sourceFile.attr().line.replace("L", "");
        const lines = line.split("-");
        const lineStart = lines[0];
        const lineEnd = lines[1];
        const source = {
            file: file,
            lineStart: Number(lineStart),
        };
        if (lineEnd) {
            source.lineEnd = Number(lineEnd);
        }
        return source;
    }
    parsePanelPage(pageContent) {
        const $ = this.parseContent(pageContent);
        const parent = this.trimMultiLineString($("panel > parent").text());
        const description = $("panel > description").html();
        const panel = {
            parent: parent,
        };
        if (description && description !== "") {
            panel.description = this.trimMultiLineString(description);
        }
        return panel;
    }
    parseTypePage(pageContent) {
        const $ = this.parseContent(pageContent);
        const name = $("type").attr().name;
        const description = $("type > summary").html();
        const type = {
            name: name,
        };
        if (description && description !== "") {
            type.description = this.trimMultiLineString(description);
        }
        return type;
    }
    parseEnumPage(pageContent) {
        const $ = this.parseContent(pageContent);
        const realmsRaw = this.trimMultiLineString($("enum > realm").text());
        const realms = this.parseRealms(realmsRaw);
        const description = $("enum > description").html();
        const enumFields = [];
        $("enum > items")
            .children()
            .each((i, element) => {
            if (element.type !== "tag") {
                return;
            }
            const name = element.attribs.key;
            const value = element.attribs.value;
            const description = $(element).html();
            const enumField = {
                name: name,
                value: Number(value),
            };
            if (description && description !== "") {
                enumField.description = this.trimMultiLineString(description);
            }
            enumFields.push(enumField);
        });
        const _enum = {
            fields: enumFields,
            realms: realms,
        };
        if (description && description !== "") {
            _enum.description = this.trimMultiLineString(description);
        }
        return _enum;
    }
    parseStructPage(pageContent) {
        const $ = this.parseContent(pageContent);
        const realmsRaw = this.trimMultiLineString($("structure > realm").text());
        const realms = this.parseRealms(realmsRaw);
        const description = $("structure > description").html();
        const structFields = [];
        $("structure > fields")
            .children()
            .each((i, element) => {
            if (element.type !== "tag") {
                return;
            }
            const name = element.attribs.name;
            const type = element.attribs.type;
            const description = $(element).html();
            const structField = {
                name: name,
                type: type,
            };
            if (element.attribs.default) {
                structField.default = element.attribs.default;
            }
            if (description && description !== "") {
                structField.description = this.trimMultiLineString(description);
            }
            structFields.push(structField);
        });
        const struct = {
            fields: structFields,
            realms: realms,
        };
        if (description && description !== "") {
            struct.description = this.trimMultiLineString(description);
        }
        return struct;
    }
    parseRealms(realmsRaw) {
        const realms = new Set();
        const realmsRawLower = realmsRaw.toLowerCase();
        if (realmsRawLower.includes("client")) {
            realms.add("client");
        }
        if (realmsRawLower.includes("menu")) {
            realms.add("menu");
        }
        if (realmsRawLower.includes("server")) {
            realms.add("server");
        }
        if (realmsRawLower.includes("shared")) {
            realms.add("client");
            realms.add("server");
        }
        return Array.from(realms);
    }
    isPanelPage(pageContent) {
        const $ = this.parseContent(pageContent);
        return $("panel").length > 0;
    }
    isClassFieldPage(pageContent) {
        const $ = this.parseContent(pageContent);
        return $("function[type$=field]").length > 0;
    }
    isFunctionPage(pageContent) {
        const $ = this.parseContent(pageContent);
        return $("function").length > 0;
    }
    isTypePage(pageContent) {
        const $ = this.parseContent(pageContent);
        return $("type").length > 0;
    }
    isEnumPage(pageContent) {
        const $ = this.parseContent(pageContent);
        return $("enum").length > 0;
    }
    isStructPage(pageContent) {
        const $ = this.parseContent(pageContent);
        return $("structure").length > 0;
    }
    parseFunctionArguments(argsElement) {
        if (!isTagElement(argsElement)) {
            throw new Error(`Expected a tag element, got ${argsElement.type}`);
        }
        return argsElement.children
            .filter(isTagElement)
            .map((element) => {
            const name = element.attribs.name;
            const type = element.attribs.type;
            const defaultValue = element.attribs.default;
            let description = cheerio
                .load(element.children, { decodeEntities: false })
                .html();
            if (description != null && description !== "") {
                description = this.trimMultiLineString(description);
            }
            return {
                name: name,
                type: type,
                default: defaultValue,
                description: description,
            };
        });
    }
    parseContent(content) {
        return cheerio.load(content, { decodeEntities: false });
    }
    isValidDescription(str) {
        return str != null && str != "";
    }
    trimMultiLineString(str) {
        return str
            .split("\n")
            .map((line) => line.trim())
            .join("\n")
            .trim();
    }
}
