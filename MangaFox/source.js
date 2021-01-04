(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Sources = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Madara = void 0;
const Source_1 = require("./Source");
const Manga_1 = require("../models/Manga");
class Madara extends Source_1.Source {
    constructor(cheerio) {
        super(cheerio);
    }
    //This is to let Madara sources override selectors without needing to override whole methods
    get titleSelector() { return 'div.post-title h1'; }
    get authorSelector() { return 'div.author-content'; }
    get genresSelector() { return 'div.genres-content a'; }
    get artistSelector() { return 'div.artist-content'; }
    get ratingSelector() { return 'span#averagerate'; }
    get thumbnailSelector() { return 'div.summary_image img'; }
    get thumbnailAttr() { return 'src'; }
    get chapterListSelector() { return 'li.wp-manga-chapter'; }
    get pageListSelector() { return 'div.page-break'; }
    get pageImageAttr() { return 'src'; }
    get searchMangaSelector() { return 'div.c-tabs-item__content'; }
    get searchCoverAttr() { return 'src'; }
    getMangaDetailsRequest(ids) {
        let requests = [];
        for (let id of ids) {
            let metadata = { 'id': id };
            requests.push(createRequestObject({
                url: this.MadaraDomain + "/manga/" + id,
                metadata: metadata,
                method: 'GET'
            }));
        }
        return requests;
    }
    getMangaDetails(data, metadata) {
        var _a, _b;
        let manga = [];
        let $ = this.cheerio.load(data);
        let title = $(this.titleSelector).first().children().remove().end().text().trim();
        let titles = [title];
        titles.push.apply(titles, $('div.summary-content').eq(2).text().trim().split(", "));
        let author = $(this.authorSelector).text().trim();
        let tagSections = [createTagSection({ id: '0', label: 'genres', tags: [] })];
        for (let genre of $(this.genresSelector).toArray()) {
            let id = (_b = (_a = $(genre).attr("href")) === null || _a === void 0 ? void 0 : _a.split('/').pop()) !== null && _b !== void 0 ? _b : '';
            let tag = $(genre).text();
            tagSections[0].tags.push(createTag({ id: id, label: tag }));
        }
        let status = ($("div.summary-content").last().text() == "Completed") ? Manga_1.MangaStatus.COMPLETED : Manga_1.MangaStatus.ONGOING;
        let averageRating = $(this.ratingSelector).text().trim();
        let src = $(this.thumbnailSelector).attr(this.thumbnailAttr);
        //Not sure if that double slash happens with any Madara source, but added just in case
        src = (src === null || src === void 0 ? void 0 : src.startsWith("http")) ? src : this.MadaraDomain + (src === null || src === void 0 ? void 0 : src.replace("//", ""));
        let artist = $(this.artistSelector).text().trim();
        let description = ($("div.description-summary  div.summary__content").find("p").text() != "") ? $("div.description-summary  div.summary__content").find("p").text().replace(/<br>/g, '\n') : $("div.description-summary  div.summary__content").text();
        return [createManga({
                id: metadata.id,
                titles: titles,
                image: src,
                avgRating: Number(averageRating),
                rating: Number(averageRating),
                author: author,
                artist: artist,
                desc: description,
                status: status,
                tags: tagSections,
                langName: this.language,
                langFlag: this.langFlag
            })];
    }
    getChaptersRequest(mangaId) {
        let metadata = { 'id': mangaId };
        return createRequestObject({
            url: `${this.MadaraDomain}/manga/${mangaId}`,
            method: "GET",
            metadata: metadata
        });
    }
    getChapters(data, metadata) {
        let $ = this.cheerio.load(data);
        let chapters = [];
        for (let elem of $(this.chapterListSelector).toArray()) {
            let name = $(elem).find("a").first().text().trim();
            let id = /[0-9.]+/.exec(name)[0];
            let imgDate = $(elem).find("img").attr("alt");
            let time = (imgDate != undefined) ? this.convertTime(imgDate) : this.parseChapterDate($(elem).find("span.chapter-release-date i").first().text());
            chapters.push(createChapter({
                id: id !== null && id !== void 0 ? id : '',
                chapNum: Number(id),
                mangaId: metadata.id,
                name: name,
                time: time,
                langCode: this.langCode,
            }));
        }
        return chapters;
    }
    parseChapterDate(date) {
        if (date.toLowerCase().includes("ago")) {
            return this.convertTime(date);
        }
        if (date.toLowerCase().startsWith("yesterday")) {
            //To start it at the beginning of yesterday, instead of exactly 24 hrs prior to now
            return new Date((Math.floor(Date.now() / 86400000) * 86400000) - 86400000);
        }
        if (date.toLowerCase().startsWith("today")) {
            return new Date(Math.floor(Date.now() / 86400000) * 8640000);
        }
        if (/\d+(st|nd|rd|th)/.test(date)) {
            let match = /\d+(st|nd|rd|th)/.exec(date)[0];
            let day = match.replace(/\D/g, "");
            return new Date(date.replace(match, day));
        }
        return new Date(date);
    }
    getChapterDetailsRequest(mangaId, chId) {
        let metadata = { 'mangaId': mangaId, 'chapterId': chId, 'nextPage': false, 'page': 1 };
        return createRequestObject({
            url: `${this.MadaraDomain}/manga/${mangaId}/chapter-${chId.replace('.', '-')}`,
            method: "GET",
            metadata: metadata
        });
    }
    getChapterDetails(data, metadata) {
        var _a;
        let pages = [];
        let $ = this.cheerio.load(data);
        let pageElements = $(this.pageListSelector);
        for (let page of pageElements.toArray()) {
            pages.push((_a = $(page)) === null || _a === void 0 ? void 0 : _a.find("img").first().attr(this.pageImageAttr).trim());
        }
        let chapterDetails = createChapterDetails({
            id: metadata.chapterId,
            mangaId: metadata.mangaId,
            pages: pages,
            longStrip: false
        });
        return chapterDetails;
    }
    constructSearchRequest(query, page) {
        var _a;
        let url = `${this.MadaraDomain}/page/${page}/?`;
        let author = query.author || '';
        let artist = query.artist || '';
        let genres = ((_a = query.includeGenre) !== null && _a !== void 0 ? _a : []).join(",");
        let paramaters = { "s": query.title, "post_type": "wp-manga", "author": author, "artist": artist, "genres": genres };
        return createRequestObject({
            url: url + new URLSearchParams(paramaters).toString(),
            method: 'GET',
            metadata: {
                request: query,
                page: page
            }
        });
    }
    searchRequest(query) {
        var _a;
        return (_a = this.constructSearchRequest(query, 1)) !== null && _a !== void 0 ? _a : null;
    }
    search(data, metadata) {
        var _a, _b, _c;
        let $ = this.cheerio.load(data);
        let mangas = [];
        for (let manga of $(this.searchMangaSelector).toArray()) {
            let id = (_b = (_a = $("div.post-title a", manga).attr("href")) === null || _a === void 0 ? void 0 : _a.split("/")[4]) !== null && _b !== void 0 ? _b : '';
            if (!id.endsWith("novel")) {
                let cover = $("img", manga).first().attr(this.searchCoverAttr);
                cover = (cover === null || cover === void 0 ? void 0 : cover.startsWith("http")) ? cover : this.MadaraDomain + (cover === null || cover === void 0 ? void 0 : cover.replace("//", "/"));
                let title = $("div.post-title a", manga).text();
                let author = $("div.summary-content > a[href*=manga-author]", manga).text().trim();
                let alternatives = $("div.summary-content", manga).first().text().trim();
                mangas.push(createMangaTile({
                    id: id,
                    image: cover,
                    title: createIconText({ text: title !== null && title !== void 0 ? title : '' }),
                    subtitleText: createIconText({ text: author !== null && author !== void 0 ? author : '' })
                }));
            }
        }
        return createPagedResults({
            results: mangas,
            nextPage: (_c = this.constructSearchRequest(metadata.query, metadata.page + 1)) !== null && _c !== void 0 ? _c : undefined
        });
    }
}
exports.Madara = Madara;

},{"../models/Manga":11,"./Source":3}],3:[function(require,module,exports){
"use strict";
/**
 * Request objects hold information for a particular source (see sources for example)
 * This allows us to to use a generic api to make the calls against any source
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Source = void 0;
class Source {
    constructor(cheerio) {
        this.cheerio = cheerio;
    }
    /**
     * An optional field where the author may put a link to their website
     */
    get authorWebsite() { return null; }
    /**
     * An optional field that defines the language of the extension's source
     */
    get language() { return 'all'; }
    /**
     * An optional field of source tags: Little bits of metadata which is rendered on the website
     * under your repositories section
     */
    get sourceTags() { return []; }
    // <-----------        OPTIONAL METHODS        -----------> //
    requestModifier(request) { return request; }
    getMangaShareUrl(mangaId) { return null; }
    getCloudflareBypassRequest() { return null; }
    /**
     * Returns the number of calls that can be done per second from the application
     * This is to avoid IP bans from many of the sources
     * Can be adjusted per source since different sites have different limits
     */
    get rateLimit() { return 2; }
    /**
     * (OPTIONAL METHOD) Different sources have different tags available for searching. This method
     * should target a URL which allows you to parse apart all of the available tags which a website has.
     * This will populate tags in the iOS application where the user can use
     * @returns A request object which can provide HTML for determining tags that a source uses
     */
    getTagsRequest() { return null; }
    /**
     * (OPTIONAL METHOD) A function which should handle parsing apart HTML returned from {@link Source.getTags}
     * and generate a list of {@link TagSection} objects, determining what sections of tags an app has, as well as
     * what tags are associated with each section
     * @param data HTML which can be parsed to get tag information
     */
    getTags(data) { return null; }
    /**
     * (OPTIONAL METHOD) A function which should handle generating a request for determining whether or
     * not a manga has been updated since a specific reference time.
     * This method is different depending on the source. A current implementation for a source, as example,
     * is going through multiple pages of the 'latest' section, and determining whether or not there
     * are entries available before your supplied date.
     * @param ids The manga IDs which you are searching for updates on
     * @param time A {@link Date} marking the point in time you'd like to search up from.
     * Eg, A date of November 2020, when it is currently December 2020, should return all instances
     * of the image you are searching for, which has been updated in the last month
     * @param page A page number parameter may be used if your update scanning requires you to
     * traverse multiple pages.
     */
    filterUpdatedMangaRequest(ids, time) { return null; }
    /**
     * (OPTIONAL METHOD) A function which should handle parsing apart HTML returned from {@link Source.filterUpdatedMangaRequest}
     * and generate a list manga which has been updated within the timeframe specified in the request.
     * @param data HTML which can be parsed to determine whether or not a Manga has been updated or not
     * @param metadata Anything passed to the {@link Request} object in {@link Source.filterUpdatedMangaRequest}
     * with the key of metadata will be available to this method here in this parameter
     * @returns A list of mangaID which has been updated. Also, a nextPage parameter is required. This is a flag
     * which should be set to true, if you need to traverse to the next page of your search, in order to fully
     * determine whether or not you've gotten all of the updated manga or not. This will increment
     * the page number in the {@link Source.filterUpdatedMangaRequest} method and run it again with the new
     * parameter
     */
    filterUpdatedManga(data, metadata) { return null; }
    /**
     * (OPTIONAL METHOD) A function which should generate a {@link HomeSectionRequest} with the intention
     * of parsing apart a home page of a source, and grouping content into multiple categories.
     * This does not exist for all sources, but sections you would commonly see would be
     * 'Latest Manga', 'Hot Manga', 'Recommended Manga', etc.
     * @returns A list of {@link HomeSectionRequest} objects. A request for search section on the home page.
     * It is likely that your request object will be the same in all of them.
     */
    getHomePageSectionRequest() { return null; }
    /**
     * (OPTIONAL METHOD) A function which should handle parsing apart HTML returned from {@link Source.getHomePageSectionRequest}
     * and finish filling out the {@link HomeSection} objects.
     * Generally this simply should update the parameter objects with all of the correct contents, and
     * return the completed array
     * @param data The HTML which should be parsed into the {@link HomeSection} objects. There may only be one element in the array, that is okay
     * if only one section exists
     * @param section The list of HomeSection objects which are unfinished, and need filled out
     */
    getHomePageSections(data, section) { return null; }
    /**
     * (OPTIONAL METHOD) A function which should handle parsing apart a page
     * and generate different {@link MangaTile} objects which can be found on it
     * @param data HTML which should be parsed into a {@link MangaTile} object
     * @param key
     */
    getViewMoreItems(data, key, metadata) { return null; }
    // <-----------        PROTECTED METHODS        -----------> //
    // Many sites use '[x] time ago' - Figured it would be good to handle these cases in general
    convertTime(timeAgo) {
        var _a;
        let time;
        let trimmed = Number(((_a = /\d*/.exec(timeAgo)) !== null && _a !== void 0 ? _a : [])[0]);
        trimmed = (trimmed == 0 && timeAgo.includes('a')) ? 1 : trimmed;
        if (timeAgo.includes('minutes')) {
            time = new Date(Date.now() - trimmed * 60000);
        }
        else if (timeAgo.includes('hours')) {
            time = new Date(Date.now() - trimmed * 3600000);
        }
        else if (timeAgo.includes('days')) {
            time = new Date(Date.now() - trimmed * 86400000);
        }
        else if (timeAgo.includes('year') || timeAgo.includes('years')) {
            time = new Date(Date.now() - trimmed * 31556952000);
        }
        else {
            time = new Date(Date.now());
        }
        return time;
    }
}
exports.Source = Source;

},{}],4:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./Madara"), exports);
__exportStar(require("./Source"), exports);

},{"./Madara":2,"./Source":3}],5:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./base"), exports);
__exportStar(require("./models"), exports);
__exportStar(require("./APIWrapper"), exports);

},{"./APIWrapper":1,"./base":4,"./models":19}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],7:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],8:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],9:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageCode = void 0;
var LanguageCode;
(function (LanguageCode) {
    LanguageCode["UNKNOWN"] = "_unknown";
    LanguageCode["BENGALI"] = "bd";
    LanguageCode["BULGARIAN"] = "bg";
    LanguageCode["BRAZILIAN"] = "br";
    LanguageCode["CHINEESE"] = "cn";
    LanguageCode["CZECH"] = "cz";
    LanguageCode["GERMAN"] = "de";
    LanguageCode["DANISH"] = "dk";
    LanguageCode["ENGLISH"] = "gb";
    LanguageCode["SPANISH"] = "es";
    LanguageCode["FINNISH"] = "fi";
    LanguageCode["FRENCH"] = "fr";
    LanguageCode["WELSH"] = "gb";
    LanguageCode["GREEK"] = "gr";
    LanguageCode["CHINEESE_HONGKONG"] = "hk";
    LanguageCode["HUNGARIAN"] = "hu";
    LanguageCode["INDONESIAN"] = "id";
    LanguageCode["ISRELI"] = "il";
    LanguageCode["INDIAN"] = "in";
    LanguageCode["IRAN"] = "ir";
    LanguageCode["ITALIAN"] = "it";
    LanguageCode["JAPANESE"] = "jp";
    LanguageCode["KOREAN"] = "kr";
    LanguageCode["LITHUANIAN"] = "lt";
    LanguageCode["MONGOLIAN"] = "mn";
    LanguageCode["MEXIAN"] = "mx";
    LanguageCode["MALAY"] = "my";
    LanguageCode["DUTCH"] = "nl";
    LanguageCode["NORWEGIAN"] = "no";
    LanguageCode["PHILIPPINE"] = "ph";
    LanguageCode["POLISH"] = "pl";
    LanguageCode["PORTUGUESE"] = "pt";
    LanguageCode["ROMANIAN"] = "ro";
    LanguageCode["RUSSIAN"] = "ru";
    LanguageCode["SANSKRIT"] = "sa";
    LanguageCode["SAMI"] = "si";
    LanguageCode["THAI"] = "th";
    LanguageCode["TURKISH"] = "tr";
    LanguageCode["UKRAINIAN"] = "ua";
    LanguageCode["VIETNAMESE"] = "vn";
})(LanguageCode = exports.LanguageCode || (exports.LanguageCode = {}));

},{}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MangaStatus = void 0;
var MangaStatus;
(function (MangaStatus) {
    MangaStatus[MangaStatus["ONGOING"] = 1] = "ONGOING";
    MangaStatus[MangaStatus["COMPLETED"] = 0] = "COMPLETED";
})(MangaStatus = exports.MangaStatus || (exports.MangaStatus = {}));

},{}],12:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],13:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],14:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],15:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],16:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TagType = void 0;
/**
 * An enumerator which {@link SourceTags} uses to define the color of the tag rendered on the website.
 * Five types are available: blue, green, grey, yellow and red, the default one is blue.
 * Common colors are red for (Broken), yellow for (+18), grey for (Country-Proof)
 */
var TagType;
(function (TagType) {
    TagType["BLUE"] = "default";
    TagType["GREEN"] = "success";
    TagType["GREY"] = "info";
    TagType["YELLOW"] = "warning";
    TagType["RED"] = "danger";
})(TagType = exports.TagType || (exports.TagType = {}));

},{}],18:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],19:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./Chapter"), exports);
__exportStar(require("./ChapterDetails"), exports);
__exportStar(require("./HomeSection"), exports);
__exportStar(require("./Manga"), exports);
__exportStar(require("./MangaTile"), exports);
__exportStar(require("./RequestObject"), exports);
__exportStar(require("./SearchRequest"), exports);
__exportStar(require("./TagSection"), exports);
__exportStar(require("./SourceTag"), exports);
__exportStar(require("./Languages"), exports);
__exportStar(require("./Constants"), exports);
__exportStar(require("./MangaUpdate"), exports);
__exportStar(require("./PagedResults"), exports);

},{"./Chapter":6,"./ChapterDetails":7,"./Constants":8,"./HomeSection":9,"./Languages":10,"./Manga":11,"./MangaTile":12,"./MangaUpdate":13,"./PagedResults":14,"./RequestObject":15,"./SearchRequest":16,"./SourceTag":17,"./TagSection":18}],20:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MangaFox = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const MF_DOMAIN = 'https://fanfox.net';
const MF_DOMAIN_MOBILE = 'https://m.fanfox.net';
class MangaFox extends paperback_extensions_common_1.Source {
    constructor(cheerio) {
        super(cheerio);
    }
    get version() { return '1.2.61'; }
    get name() { return 'MangaFox'; }
    get icon() { return 'icon.png'; }
    get author() { return 'Sirus'; }
    get authorWebsite() { return 'https://github.com/Sirush'; }
    get description() { return 'Extension that pulls manga from MangaFox, includes Advanced Search and Updated manga fetching'; }
    get hentaiSource() {
        return false;
    }
    get sourceTags() { return [{ text: "Buggy", type: paperback_extensions_common_1.TagType.RED }]; }
    get rateLimit() {
        return 2;
    }
    get websiteBaseURL() { return MF_DOMAIN; }
    getMangaDetailsRequest(ids) {
        let requests = [];
        for (let id of ids) {
            let metadata = { 'id': id };
            requests.push(createRequestObject({
                url: `${MF_DOMAIN}/manga/${id}`,
                method: 'GET',
                cookies: [createCookie({ name: 'isAdult', value: '1', domain: MF_DOMAIN })],
                metadata: metadata
            }));
        }
        return requests;
    }
    getMangaDetails(data, metadata) {
        let mangas = [];
        let tagRegexp = new RegExp('\\/directory\\/(.*)\\/');
        let $ = this.cheerio.load(data);
        let tagSections = [createTagSection({ id: '0', label: 'genres', tags: [] }),
            createTagSection({ id: '1', label: 'format', tags: [] })];
        let details = $('.detail-info-right');
        let cover = $('img.detail-bg-img').first().attr('src');
        let title = $('span.detail-info-right-title-font', details).text().trim();
        let rawStatus = $('span.detail-info-right-title-tip', details).text().trim();
        let rating = $('span.item-score', details).text().trim().replace(',', '.');
        let author = $('p.detail-info-right-say a', details).text().trim();
        let isAdult = false;
        let tags = $('a', '.detail-info-right-tag-list').each((i, tag) => {
            let id = $(tag).attr('href').match(tagRegexp)[1];
            let label = $(tag).text().trim();
            if ((label === null || label === void 0 ? void 0 : label.includes('Adult')) || (label === null || label === void 0 ? void 0 : label.includes('Mature')))
                isAdult = true;
            tagSections[0].tags.push(createTag({ id: id, label: label }));
        });
        for (let tag in tags) {
        }
        let description = $('p.fullcontent').text().trim();
        let status = paperback_extensions_common_1.MangaStatus.ONGOING;
        switch (rawStatus) {
            case 'Ongoing':
                status = paperback_extensions_common_1.MangaStatus.ONGOING;
                break;
            case 'Completed':
                status = paperback_extensions_common_1.MangaStatus.COMPLETED;
                break;
            default:
                status = paperback_extensions_common_1.MangaStatus.ONGOING;
                break;
        }
        let titles = [];
        titles.push(title);
        mangas.push(createManga({
            id: metadata.id,
            titles: titles,
            image: cover,
            rating: Number(rating),
            status: status,
            author: author,
            tags: tagSections,
            desc: description,
            hentai: isAdult
        }));
        return mangas;
    }
    getChaptersRequest(mangaId) {
        let metadata = { mangaId };
        return createRequestObject({
            url: `${MF_DOMAIN}/manga/${mangaId}`,
            method: "GET",
            metadata: metadata,
            cookies: [createCookie({ name: 'isAdult', value: '1', domain: MF_DOMAIN })]
        });
    }
    getChapters(data, metadata) {
        var _a, _b;
        let $ = this.cheerio.load(data);
        let chapters = [];
        let rawChapters = $('div#chapterlist ul li').children('a').toArray().reverse();
        let chapterIdRegex = new RegExp('\\/manga\\/[a-zA-Z0-9_]*\\/(.*)\\/');
        let chapterNumberRegex = new RegExp('c([0-9.]+)');
        let volumeRegex = new RegExp('Vol.(\\d+)');
        for (let element of rawChapters) {
            let title = (_a = $('p.title3', element).html()) !== null && _a !== void 0 ? _a : '';
            let date = this.parseDate((_b = $('p.title2', element).html()) !== null && _b !== void 0 ? _b : '');
            let chapterId = element.attribs['href'].match(chapterIdRegex)[1];
            let chapterNumber = Number("0" + chapterId.match(chapterNumberRegex)[1]);
            let volMatch = title.match(volumeRegex);
            let volume = volMatch != null && volMatch.length > 0 ? Number(volMatch[1]) : undefined;
            chapters.push(createChapter({
                id: chapterId,
                mangaId: metadata.mangaId,
                time: date,
                name: title,
                langCode: paperback_extensions_common_1.LanguageCode.ENGLISH,
                chapNum: chapterNumber,
                volume: volume
            }));
        }
        return chapters;
    }
    getChapterDetailsRequest(mangaId, chapId) {
        let metadata = { 'mangaId': mangaId, 'chapterId': chapId, 'nextPage': false, 'page': 1 };
        return createRequestObject({
            url: `${MF_DOMAIN_MOBILE}/roll_manga/${mangaId}/${chapId}`,
            method: "GET",
            metadata: metadata,
            cookies: [createCookie({ name: 'isAdult', value: '1', domain: MF_DOMAIN })]
        });
    }
    getChapterDetails(data, metadata) {
        let $ = this.cheerio.load(data);
        let pages = [];
        var rawPages = $('div#viewer').children('img').toArray();
        for (let page of rawPages) {
            let url = page.attribs['data-original'];
            if (url.startsWith("//")) {
                url = "https:" + url;
            }
            pages.push(url);
        }
        let chapterDetails = createChapterDetails({
            id: metadata.chapterId,
            mangaId: metadata.mangaId,
            pages: pages,
            longStrip: false
        });
        return chapterDetails;
    }
    getHomePageSectionRequest() {
        let request = createRequestObject({ url: `${MF_DOMAIN}`, method: 'GET' });
        let section1 = createHomeSection({ id: 'hot_manga', title: 'Hot Manga Releases' });
        let section2 = createHomeSection({ id: 'being_read', title: 'Being Read Right Now' });
        let section3 = createHomeSection({ id: 'new_manga', title: 'New Manga Release' });
        let section4 = createHomeSection({ id: 'latest_updates', title: 'Latest Updates' });
        return [createHomeSectionRequest({ request: request, sections: [section1, section2, section3, section4] })];
    }
    getHomePageSections(data, sections) {
        let $ = this.cheerio.load(data);
        let hotManga = [];
        let beingReadManga = [];
        let newManga = [];
        let latestManga = [];
        let idRegExp = new RegExp('\\/manga\\/(.*)\\/');
        let firstSection = $('div.main-large').first();
        let hotMangas = $('.manga-list-1', firstSection).first();
        let beingReadMangas = hotMangas.next();
        let newMangas = $('div.line-list');
        let latestMangas = $('ul.manga-list-4-list');
        for (let manga of $('li', hotMangas).toArray()) {
            let id = $('a', manga).first().attr('href').match(idRegExp)[1];
            let cover = $('img', manga).first().attr('src');
            let title = $('.manga-list-1-item-title', manga).text().trim();
            let subtitle = $('.manga-list-1-item-subtitle', manga).text().trim();
            hotManga.push(createMangaTile({
                id: id,
                image: cover,
                title: createIconText({ text: title }),
                subtitleText: createIconText({ text: subtitle }),
            }));
        }
        for (let manga of $('li', beingReadMangas).toArray()) {
            let id = $('a', manga).first().attr('href').match(idRegExp)[1];
            let cover = $('img', manga).first().attr('src');
            let title = $('.manga-list-1-item-title', manga).text().trim();
            let subtitle = $('.manga-list-1-item-subtitle', manga).text().trim();
            beingReadManga.push(createMangaTile({
                id: id,
                image: cover,
                title: createIconText({ text: title }),
                subtitleText: createIconText({ text: subtitle }),
            }));
        }
        for (let manga of $('li', newMangas).toArray()) {
            let id = $('a', manga).first().attr('href').match(idRegExp)[1];
            let cover = $('img', manga).first().attr('src');
            let title = $('.manga-list-1-item-title', manga).text().trim();
            let subtitle = $('.manga-list-1-item-subtitle', manga).text().trim();
            newManga.push(createMangaTile({
                id: id,
                image: cover,
                title: createIconText({ text: title }),
                subtitleText: createIconText({ text: subtitle }),
            }));
        }
        for (let manga of $('.manga-list-4-list > li', latestMangas).toArray()) {
            let id = $('a', manga).first().attr('href').match(idRegExp)[1];
            let cover = $('img', manga).first().attr('src');
            let title = $('.manga-list-4-item-title', manga).text().trim();
            let subtitle = $('.manga-list-4-item-subtitle', manga).text().trim();
            latestManga.push(createMangaTile({
                id: id,
                image: cover,
                title: createIconText({ text: title }),
                subtitleText: createIconText({ text: subtitle }),
            }));
        }
        // console.log(updateManga)
        sections[0].items = hotManga;
        sections[1].items = beingReadManga;
        sections[2].items = newManga;
        sections[3].items = latestManga;
        return sections;
    }
    searchRequest(query) {
        var _a, _b, _c, _d;
        let genres = ((_a = query.includeGenre) !== null && _a !== void 0 ? _a : []).join(',');
        let excluded = ((_b = query.excludeGenre) !== null && _b !== void 0 ? _b : []).join(',,');
        let type = ((_c = query.includeFormat) !== null && _c !== void 0 ? _c : [])[0];
        let status = "";
        switch (query.status) {
            case 0:
                status = '2';
                break;
            case 1:
                status = '1';
                break;
            default:
                status = '0';
        }
        let search = `name=${encodeURI((_d = query.title) !== null && _d !== void 0 ? _d : '')}&`;
        search += `author=${encodeURI(query.author || '')}&`;
        search += `artist=${encodeURI(query.artist || '')}&`;
        search += `type=${type}&genres=${genres}&nogenres=${excluded}&st=${status}`;
        let metadata = { 'search': search };
        return createRequestObject({
            url: `${MF_DOMAIN}/search?${search}`,
            method: 'GET',
            metadata: metadata,
            cookies: [createCookie({ name: 'isAdult', value: '1', domain: MF_DOMAIN })]
        });
    }
    search(data, metadata) {
        let $ = this.cheerio.load(data);
        let mangas = [];
        let idRegExp = new RegExp('\\/manga\\/(.*)\\/');
        $('ul.manga-list-4-list').children('li').each((index, manga) => {
            let id = $('a', manga).first().attr('href').match(idRegExp)[1];
            let cover = $('img', manga).first().attr('src');
            let title = $('p.manga-list-4-item-title a', manga).first().text().trim();
            let tips = $('p.manga-list-4-item-tip', manga).toArray();
            let author = $('a', tips[0]).text().trim();
            let lastUpdate = $('a', tips[1]).text().trim();
            let shortDesc = $(tips[2]).text().trim();
            mangas.push(createMangaTile({
                id: id,
                image: cover,
                title: createIconText({ text: title !== null && title !== void 0 ? title : '' }),
                subtitleText: createIconText({ text: author !== null && author !== void 0 ? author : '' }),
                primaryText: createIconText({ text: shortDesc !== null && shortDesc !== void 0 ? shortDesc : '' }),
                secondaryText: createIconText({ text: lastUpdate !== null && lastUpdate !== void 0 ? lastUpdate : '' }),
            }));
        });
        return createPagedResults({
            results: mangas
        });
    }
    getMangaShareUrl(mangaId) {
        return `${MF_DOMAIN}/manga/${mangaId}`;
    }
    filterUpdatedMangaRequest(ids, time) {
        let metadata = { ids: ids, targetDate: time, page: 1 };
        return createRequestObject({
            url: `${MF_DOMAIN}/releases/1.html`,
            method: 'GET',
            metadata: metadata,
            cookies: [createCookie({ name: 'isAdult', value: '1', domain: MF_DOMAIN })]
        });
    }
    filterUpdatedManga(data, metadata) {
        var _a;
        let $ = this.cheerio.load(data);
        let nextPage = true;
        let updatedManga = [];
        for (let obj of $('li', $('.manga-list-4-list')).toArray()) {
            // If the time for this object is later than our target date, do not navigate to the next page
            let dateContext = $('.manga-list-4-item-subtitle', $(obj));
            let date = $('span', dateContext).text();
            let dateObj = this.parseDate(date);
            // Was this a good date parse? If the date is not valid, continue to the next object.
            if (dateObj.toString().includes("Invalid")) {
                continue;
            }
            if (metadata.targetDate < dateObj) {
                // We've gone past our target date, we're safe to stop here
                nextPage = false;
                break;
            }
            else {
                // This is a valid date, check if this is a title which we are looking for
                let mangaIdContext = $('.manga-list-4-item-title', $(obj));
                let mangaId = $('a', mangaIdContext).attr('href').replace('/manga/', '').replace('/', '');
                if (metadata.ids.includes(mangaId)) { // If we have a matching ID, add it to our return list!
                    updatedManga.push(mangaId);
                }
            }
        }
        // If we've reached the end of our scan, return and exit
        if (!nextPage) {
            return createMangaUpdates({
                ids: updatedManga
            });
        }
        // If we are not on the last available page, create a request to scan to the next
        let pagerElements = $('a', $('.pager-list-left')).toArray();
        if (Number((_a = $(pagerElements[pagerElements.length - 1]).attr('href')) === null || _a === void 0 ? void 0 : _a.replace('/releases/', '').replace('.html', '')) > metadata.page) {
            metadata.page = metadata.page++;
            let request = createRequestObject({
                url: `${MF_DOMAIN}/releases/${metadata.page}.html`,
                method: 'GET',
                metadata: metadata,
                cookies: [createCookie({ name: 'isAdult', value: '1', domain: MF_DOMAIN })]
            });
            return createMangaUpdates({
                ids: updatedManga,
                nextPage: request
            });
        }
        return createMangaUpdates({ ids: updatedManga });
    }
    parseDate(date) {
        let dateObj;
        if (date.includes("Today")) {
            dateObj = new Date(); // Create a comparison date for the current day
        }
        else if (date.includes("Yesterday")) {
            dateObj = new Date(); // Create a comparison date for yesterday
            dateObj.setDate(dateObj.getDate() - 1);
        }
        else if (date.includes("hour")) {
            let hour = Number.parseInt(date.match("[0-9]*")[0]);
            if (hour == null) {
                hour = 0;
            }
            dateObj = new Date();
            dateObj.setHours(dateObj.getHours() - hour);
        }
        else if (date.includes("minute")) {
            let minute = Number.parseInt(date.match("[0-9]*")[0]);
            if (minute == null) {
                minute = 0;
            }
            dateObj = new Date();
            dateObj.setMinutes(dateObj.getMinutes() - minute);
        }
        else if (date.includes("second")) {
            let second = Number.parseInt(date.match("[0-9]*")[0]);
            if (second == null) {
                second = 0;
            }
            dateObj = new Date();
            dateObj.setSeconds(dateObj.getSeconds() - second);
        }
        else {
            dateObj = new Date(date);
        }
        return dateObj;
    }
}
exports.MangaFox = MangaFox;

},{"paperback-extensions-common":5}]},{},[20])(20)
});
