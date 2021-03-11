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
exports.MangaLife = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const ML_DOMAIN = 'https://manga4life.com';
let ML_IMAGE_DOMAIN = 'https://cover.mangabeast01.com/cover';
class MangaLife extends paperback_extensions_common_1.Source {
    constructor(cheerio) {
        super(cheerio);
    }
    get version() { return '1.1.3'; }
    get name() { return 'Manga4Life'; }
    get icon() { return 'icon.png'; }
    get author() { return 'Daniel Kovalevich'; }
    get authorWebsite() { return 'https://github.com/DanielKovalevich'; }
    get description() { return 'Extension that pulls manga from MangaLife, includes Advanced Search and Updated manga fetching'; }
    get hentaiSource() { return false; }
    getMangaShareUrl(mangaId) { return `${ML_DOMAIN}/manga/${mangaId}`; }
    get rateLimit() { return 2; }
    get websiteBaseURL() { return ML_DOMAIN; }
    get sourceTags() {
        return [
            {
                text: "Notifications",
                type: paperback_extensions_common_1.TagType.GREEN
            }
        ];
    }
    getMangaDetailsRequest(ids) {
        let requests = [];
        for (let id of ids) {
            let metadata = { 'id': id };
            requests.push(createRequestObject({
                url: `${ML_DOMAIN}/manga/`,
                metadata: metadata,
                method: 'GET',
                param: id
            }));
        }
        return requests;
    }
    getMangaDetails(data, metadata) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        let manga = [];
        let $ = this.cheerio.load(data);
        let json = (_b = (_a = $('[type=application\\/ld\\+json]').html()) === null || _a === void 0 ? void 0 : _a.replace(/\t*\n*/g, '')) !== null && _b !== void 0 ? _b : '';
        // this is only because they added some really jank alternate titles and didn't propely string escape
        let jsonWithoutAlternateName = json.replace(/"alternateName".*?],/g, '');
        let alternateNames = ((_c = /"alternateName": \[(.*?)\]/.exec(json)) !== null && _c !== void 0 ? _c : [])[1]
            .replace(/\"/g, '')
            .split(',');
        let parsedJson = JSON.parse(jsonWithoutAlternateName);
        let entity = parsedJson.mainEntity;
        let info = $('.row');
        let imgSource = ((_e = (_d = $('.ImgHolder').html()) === null || _d === void 0 ? void 0 : _d.match(/src="(.*)\//)) !== null && _e !== void 0 ? _e : [])[1];
        if (imgSource !== ML_IMAGE_DOMAIN)
            ML_IMAGE_DOMAIN = imgSource;
        let image = `${ML_IMAGE_DOMAIN}/${metadata.id}.jpg`;
        let title = (_f = $('h1', info).first().text()) !== null && _f !== void 0 ? _f : '';
        let titles = [title];
        let author = entity.author[0];
        titles = titles.concat(alternateNames);
        let follows = Number(((_h = (_g = $.root().html()) === null || _g === void 0 ? void 0 : _g.match(/vm.NumSubs = (.*);/)) !== null && _h !== void 0 ? _h : [])[1]);
        let tagSections = [createTagSection({ id: '0', label: 'genres', tags: [] }),
            createTagSection({ id: '1', label: 'format', tags: [] })];
        tagSections[0].tags = entity.genre.map((elem) => createTag({ id: elem, label: elem }));
        let update = entity.dateModified;
        let status = paperback_extensions_common_1.MangaStatus.ONGOING;
        let summary = '';
        let hentai = entity.genre.includes('Hentai') || entity.genre.includes('Adult');
        let details = $('.list-group', info);
        for (let row of $('li', details).toArray()) {
            let text = $('.mlabel', row).text();
            switch (text) {
                case 'Type:': {
                    let type = $('a', row).text();
                    tagSections[1].tags.push(createTag({ id: type.trim(), label: type.trim() }));
                    break;
                }
                case 'Status:': {
                    status = $(row).text().includes('Ongoing') ? paperback_extensions_common_1.MangaStatus.ONGOING : paperback_extensions_common_1.MangaStatus.COMPLETED;
                    break;
                }
                case 'Description:': {
                    summary = $('div', row).text().trim();
                    break;
                }
            }
        }
        manga.push(createManga({
            id: metadata.id,
            titles: titles,
            image: image,
            rating: 0,
            status: status,
            author: author,
            tags: tagSections,
            desc: summary,
            hentai: hentai,
            follows: follows,
            lastUpdate: update
        }));
        return manga;
    }
    getChaptersRequest(mangaId) {
        let metadata = { 'id': mangaId };
        return createRequestObject({
            url: `${ML_DOMAIN}/manga/`,
            method: "GET",
            metadata: metadata,
            headers: {
                "content-type": "application/x-www-form-urlencoded"
            },
            param: mangaId
        });
    }
    getChapters(data, metadata) {
        var _a, _b;
        let $ = this.cheerio.load(data);
        let chapterJS = JSON.parse(((_b = (_a = $.root().html()) === null || _a === void 0 ? void 0 : _a.match(/vm.Chapters = (.*);/)) !== null && _b !== void 0 ? _b : [])[1]).reverse();
        let chapters = [];
        // following the url encoding that the website uses, same variables too
        chapterJS.forEach((elem) => {
            let chapterCode = elem.Chapter;
            let vol = Number(chapterCode.substring(0, 1));
            let index = vol != 1 ? '-index-' + vol : '';
            let n = parseInt(chapterCode.slice(1, -1));
            let a = Number(chapterCode[chapterCode.length - 1]);
            let m = a != 0 ? '.' + a : '';
            let id = metadata.id + '-chapter-' + n + m + index + '.html';
            let chNum = n + a * .1;
            let name = elem.ChapterName ? elem.ChapterName : ''; // can be null
            let timeStr = elem.Date.replace(/-/g, "/");
            let time = new Date(timeStr);
            chapters.push(createChapter({
                id: id,
                mangaId: metadata.id,
                name: name,
                chapNum: chNum,
                volume: vol,
                langCode: paperback_extensions_common_1.LanguageCode.ENGLISH,
                time: time
            }));
        });
        return chapters;
    }
    getChapterDetailsRequest(mangaId, chapId) {
        let metadata = { 'mangaId': mangaId, 'chapterId': chapId, 'nextPage': false, 'page': 1 };
        return createRequestObject({
            url: `${ML_DOMAIN}/read-online/`,
            metadata: metadata,
            headers: {
                "content-type": "application/x-www-form-urlencoded"
            },
            method: 'GET',
            param: chapId
        });
    }
    getChapterDetails(data, metadata) {
        var _a, _b, _c;
        let matchedPath = (_a = data.match(/vm.CurPathName = (.*);/)) === null || _a === void 0 ? void 0 : _a[1];
        if (!matchedPath) {
            matchedPath = (_b = data.match(/vm.CurPathNames = (.*);/)) === null || _b === void 0 ? void 0 : _b[1];
        }
        let pages = [];
        let chapterInfo = JSON.parse(((_c = data.match(/vm.CurChapter = (.*);/)) !== null && _c !== void 0 ? _c : [])[1]);
        let pageNum = Number(chapterInfo.Page);
        let chapter = chapterInfo.Chapter.slice(1, -1);
        let odd = chapterInfo.Chapter[chapterInfo.Chapter.length - 1];
        let chapterImage = odd == 0 ? chapter : chapter + '.' + odd;
        for (let i = 0; i < pageNum; i++) {
            let s = '000' + (i + 1);
            let page = s.substr(s.length - 3);
            pages.push(`https://${matchedPath}/manga/${metadata.mangaId}/${chapterInfo.Directory == '' ? '' : chapterInfo.Directory + '/'}${chapterImage}-${page}.png`);
        }
        let chapterDetails = createChapterDetails({
            id: metadata.chapterId,
            mangaId: metadata.mangaId,
            pages, longStrip: false
        });
        return chapterDetails;
    }
    filterUpdatedMangaRequest(ids, time) {
        let metadata = { 'ids': ids, 'referenceTime': time };
        return createRequestObject({
            url: `${ML_DOMAIN}/`,
            metadata: metadata,
            headers: {
                "content-type": "application/x-www-form-urlencoded"
            },
            method: "GET"
        });
    }
    filterUpdatedManga(data, metadata) {
        var _a;
        let $ = this.cheerio.load(data);
        let returnObject = {
            'ids': []
        };
        let updateManga = JSON.parse(((_a = data.match(/vm.LatestJSON = (.*);/)) !== null && _a !== void 0 ? _a : [])[1]);
        updateManga.forEach((elem) => {
            if (metadata.ids.includes(elem.IndexName) && metadata.referenceTime < new Date(elem.Date))
                returnObject.ids.push(elem.IndexName);
        });
        return createMangaUpdates(returnObject);
    }
    searchRequest(query) {
        let status = "";
        switch (query.status) {
            case 0:
                status = 'Completed';
                break;
            case 1:
                status = 'Ongoing';
                break;
            default: status = '';
        }
        let genre = query.includeGenre ?
            (query.includeDemographic ? query.includeGenre.concat(query.includeDemographic) : query.includeGenre) :
            query.includeDemographic;
        let genreNo = query.excludeGenre ?
            (query.excludeDemographic ? query.excludeGenre.concat(query.excludeDemographic) : query.excludeGenre) :
            query.excludeDemographic;
        let metadata = {
            'keyword': query.title,
            'author': query.author || query.artist || '',
            'status': status,
            'type': query.includeFormat,
            'genre': genre,
            'genreNo': genreNo
        };
        return createRequestObject({
            url: `${ML_DOMAIN}/search/`,
            metadata: metadata,
            headers: {
                "content-type": "application/x-www-form-urlencoded"
            },
            method: "GET"
        });
    }
    search(data, metadata) {
        var _a, _b, _c;
        let $ = this.cheerio.load(data);
        let mangaTiles = [];
        let directory = JSON.parse(((_a = data.match(/vm.Directory = (.*);/)) !== null && _a !== void 0 ? _a : [])[1]);
        let imgSource = ((_c = (_b = $('.img-fluid').first().attr('src')) === null || _b === void 0 ? void 0 : _b.match(/(.*cover)/)) !== null && _c !== void 0 ? _c : [])[1];
        if (imgSource !== ML_IMAGE_DOMAIN)
            ML_IMAGE_DOMAIN = imgSource;
        directory.forEach((elem) => {
            let mKeyword = typeof metadata.keyword !== 'undefined' ? false : true;
            let mAuthor = metadata.author !== '' ? false : true;
            let mStatus = metadata.status !== '' ? false : true;
            let mType = typeof metadata.type !== 'undefined' && metadata.type.length > 0 ? false : true;
            let mGenre = typeof metadata.genre !== 'undefined' && metadata.genre.length > 0 ? false : true;
            let mGenreNo = typeof metadata.genreNo !== 'undefined' ? true : false;
            if (!mKeyword) {
                let allWords = [elem.s.toLowerCase()].concat(elem.al.map((e) => e.toLowerCase()));
                allWords.forEach((key) => {
                    if (key.includes(metadata.keyword.toLowerCase()))
                        mKeyword = true;
                });
            }
            if (!mAuthor) {
                let authors = elem.a.map((e) => e.toLowerCase());
                if (authors.includes(metadata.author.toLowerCase()))
                    mAuthor = true;
            }
            if (!mStatus) {
                if ((elem.ss == 'Ongoing' && metadata.status == 'Ongoing') || (elem.ss != 'Ongoing' && metadata.ss != 'Ongoing'))
                    mStatus = true;
            }
            if (!mType)
                mType = metadata.type.includes(elem.t);
            if (!mGenre)
                mGenre = metadata.genre.every((i) => elem.g.includes(i));
            if (mGenreNo)
                mGenreNo = metadata.genreNo.every((i) => elem.g.includes(i));
            if (mKeyword && mAuthor && mStatus && mType && mGenre && !mGenreNo) {
                mangaTiles.push(createMangaTile({
                    id: elem.i,
                    title: createIconText({ text: elem.s }),
                    image: `${ML_IMAGE_DOMAIN}/${elem.i}.jpg`,
                    subtitleText: createIconText({ text: elem.ss })
                }));
            }
        });
        // This source parses JSON and never requires additional pages
        return createPagedResults({
            results: mangaTiles
        });
    }
    getTagsRequest() {
        return createRequestObject({
            url: `${ML_DOMAIN}/search/`,
            method: 'GET',
            headers: {
                "content-type": "application/x-www-form-urlencoded",
            }
        });
    }
    getTags(data) {
        var _a, _b, _c;
        let tagSections = [createTagSection({ id: '0', label: 'genres', tags: [] }),
            createTagSection({ id: '1', label: 'format', tags: [] })];
        let genres = JSON.parse(((_a = data.match(/"Genre"\s*: (.*)/)) !== null && _a !== void 0 ? _a : [])[1].replace(/'/g, "\""));
        let typesHTML = ((_b = data.match(/"Type"\s*: (.*),/g)) !== null && _b !== void 0 ? _b : [])[1];
        let types = JSON.parse(((_c = typesHTML.match(/(\[.*\])/)) !== null && _c !== void 0 ? _c : [])[1].replace(/'/g, "\""));
        tagSections[0].tags = genres.map((e) => createTag({ id: e, label: e }));
        tagSections[1].tags = types.map((e) => createTag({ id: e, label: e }));
        return tagSections;
    }
    constructGetViewMoreRequest(key) {
        return createRequestObject({
            url: `${ML_DOMAIN}`,
            method: 'GET',
            metadata: {
                key
            }
        });
    }
    getHomePageSectionRequest() {
        let request = createRequestObject({ url: `${ML_DOMAIN}`, method: 'GET' });
        let section1 = createHomeSection({ id: 'hot_update', title: 'HOT UPDATES', view_more: this.constructGetViewMoreRequest('hot_update') });
        let section2 = createHomeSection({ id: 'latest', title: 'LATEST UPDATES', view_more: this.constructGetViewMoreRequest('latest') });
        let section3 = createHomeSection({ id: 'new_titles', title: 'NEW TITLES', view_more: this.constructGetViewMoreRequest('new_titles') });
        let section4 = createHomeSection({ id: 'recommended', title: 'RECOMMENDATIONS', view_more: this.constructGetViewMoreRequest('recommended') });
        return [createHomeSectionRequest({ request: request, sections: [section1, section2, section3, section4] })];
    }
    getHomePageSections(data, sections) {
        var _a, _b, _c, _d, _e, _f;
        let $ = this.cheerio.load(data);
        let hot = (JSON.parse(((_a = data.match(/vm.HotUpdateJSON = (.*);/)) !== null && _a !== void 0 ? _a : [])[1])).slice(0, 15);
        let latest = (JSON.parse(((_b = data.match(/vm.LatestJSON = (.*);/)) !== null && _b !== void 0 ? _b : [])[1])).slice(0, 15);
        let newTitles = (JSON.parse(((_c = data.match(/vm.NewSeriesJSON = (.*);/)) !== null && _c !== void 0 ? _c : [])[1])).slice(0, 15);
        let recommended = JSON.parse(((_d = data.match(/vm.RecommendationJSON = (.*);/)) !== null && _d !== void 0 ? _d : [])[1]);
        let imgSource = ((_f = (_e = $('.ImageHolder').html()) === null || _e === void 0 ? void 0 : _e.match(/ng-src="(.*)\//)) !== null && _f !== void 0 ? _f : [])[1];
        if (imgSource !== ML_IMAGE_DOMAIN)
            ML_IMAGE_DOMAIN = imgSource;
        let hotManga = [];
        hot.forEach((elem) => {
            let id = elem.IndexName;
            let title = elem.SeriesName;
            let image = `${ML_IMAGE_DOMAIN}/${id}.jpg`;
            let time = (new Date(elem.Date)).toDateString();
            time = time.slice(0, time.length - 5);
            time = time.slice(4, time.length);
            hotManga.push(createMangaTile({
                id: id,
                image: image,
                title: createIconText({ text: title }),
                secondaryText: createIconText({ text: time, icon: 'clock.fill' })
            }));
        });
        let latestManga = [];
        latest.forEach((elem) => {
            let id = elem.IndexName;
            let title = elem.SeriesName;
            let image = `${ML_IMAGE_DOMAIN}/${id}.jpg`;
            let time = (new Date(elem.Date)).toDateString();
            time = time.slice(0, time.length - 5);
            time = time.slice(4, time.length);
            latestManga.push(createMangaTile({
                id: id,
                image: image,
                title: createIconText({ text: title }),
                secondaryText: createIconText({ text: time, icon: 'clock.fill' })
            }));
        });
        let newManga = [];
        newTitles.forEach((elem) => {
            let id = elem.IndexName;
            let title = elem.SeriesName;
            let image = `${ML_IMAGE_DOMAIN}/${id}.jpg`;
            newManga.push(createMangaTile({
                id: id,
                image: image,
                title: createIconText({ text: title })
            }));
        });
        let recManga = [];
        recommended.forEach((elem) => {
            let id = elem.IndexName;
            let title = elem.SeriesName;
            let image = `${ML_IMAGE_DOMAIN}/${id}.jpg`;
            let time = (new Date(elem.Date)).toDateString();
            recManga.push(createMangaTile({
                id: id,
                image: image,
                title: createIconText({ text: title })
            }));
        });
        sections[0].items = hotManga;
        sections[1].items = latestManga;
        sections[2].items = newManga;
        sections[3].items = recManga;
        return sections;
    }
    getViewMoreRequest(key) {
        return createRequestObject({
            url: ML_DOMAIN,
            method: 'GET'
        });
    }
    getViewMoreItems(data, key) {
        var _a, _b, _c, _d;
        let manga = [];
        if (key == 'hot_update') {
            let hot = JSON.parse(((_a = data.match(/vm.HotUpdateJSON = (.*);/)) !== null && _a !== void 0 ? _a : [])[1]);
            hot.forEach((elem) => {
                let id = elem.IndexName;
                let title = elem.SeriesName;
                let image = `${ML_IMAGE_DOMAIN}/${id}.jpg`;
                let time = (new Date(elem.Date)).toDateString();
                time = time.slice(0, time.length - 5);
                time = time.slice(4, time.length);
                manga.push(createMangaTile({
                    id: id,
                    image: image,
                    title: createIconText({ text: title }),
                    secondaryText: createIconText({ text: time, icon: 'clock.fill' })
                }));
            });
        }
        else if (key == 'latest') {
            let latest = JSON.parse(((_b = data.match(/vm.LatestJSON = (.*);/)) !== null && _b !== void 0 ? _b : [])[1]);
            latest.forEach((elem) => {
                let id = elem.IndexName;
                let title = elem.SeriesName;
                let image = `${ML_IMAGE_DOMAIN}/${id}.jpg`;
                let time = (new Date(elem.Date)).toDateString();
                time = time.slice(0, time.length - 5);
                time = time.slice(4, time.length);
                manga.push(createMangaTile({
                    id: id,
                    image: image,
                    title: createIconText({ text: title }),
                    secondaryText: createIconText({ text: time, icon: 'clock.fill' })
                }));
            });
        }
        else if (key == 'recommended') {
            let latest = JSON.parse(((_c = data.match(/vm.RecommendationJSON = (.*);/)) !== null && _c !== void 0 ? _c : [])[1]);
            latest.forEach((elem) => {
                let id = elem.IndexName;
                let title = elem.SeriesName;
                let image = `${ML_IMAGE_DOMAIN}/${id}.jpg`;
                let time = (new Date(elem.Date)).toDateString();
                time = time.slice(0, time.length - 5);
                time = time.slice(4, time.length);
                manga.push(createMangaTile({
                    id: id,
                    image: image,
                    title: createIconText({ text: title }),
                    secondaryText: createIconText({ text: time, icon: 'clock.fill' })
                }));
            });
        }
        else if (key == 'new_titles') {
            let newTitles = JSON.parse(((_d = data.match(/vm.NewSeriesJSON = (.*);/)) !== null && _d !== void 0 ? _d : [])[1]);
            newTitles.forEach((elem) => {
                let id = elem.IndexName;
                let title = elem.SeriesName;
                let image = `${ML_IMAGE_DOMAIN}/${id}.jpg`;
                let time = (new Date(elem.Date)).toDateString();
                time = time.slice(0, time.length - 5);
                time = time.slice(4, time.length);
                manga.push(createMangaTile({
                    id: id,
                    image: image,
                    title: createIconText({ text: title })
                }));
            });
        }
        else
            return null;
        // This source parses JSON and never requires additional pages
        return createPagedResults({
            results: manga
        });
    }
}
exports.MangaLife = MangaLife;

},{"paperback-extensions-common":5}]},{},[20])(20)
});
