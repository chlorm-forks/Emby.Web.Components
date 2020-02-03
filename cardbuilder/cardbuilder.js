define(['datetime', 'imageLoader', 'connectionManager', 'itemHelper', 'focusManager', 'indicators', 'globalize', 'layoutManager', 'apphost', 'dom', 'browser', 'playbackManager', 'itemShortcuts', 'humanedate', 'css!./card', 'paper-icon-button-light', 'programStyles', 'embyProgressBarStyle', 'emby-checkbox', 'emby-playstatebutton', 'emby-ratingbutton'],
    function (datetime, imageLoader, connectionManager, itemHelper, focusManager, indicators, globalize, layoutManager, appHost, dom, browser, playbackManager, itemShortcuts, humanedate) {
        'use strict';

        var devicePixelRatio = window.devicePixelRatio || 1;
        var enableFocusTransfrom = !browser.tv && !browser.xboxOne && !browser.ps4 && !browser.edge && !browser.msie;
        var supportsNativeLazyLoading = 'loading' in HTMLImageElement.prototype;

        function getCardsHtml(items, options) {

            if (arguments.length === 1) {

                options = arguments[0];
                items = options.items;
            }

            return buildCardsHtmlInternal(items, options);
        }

        var cachedWidths = {};
        function getImageWidth(shape, cardClass, screenWidth) {

            var key = shape + screenWidth;

            var width = cachedWidths[key];
            if (width) {
                return width;
            }

            var div = document.createElement('div');
            div.className = 'itemsContainer';
            if (layoutManager.tv) {
                div.classList.add('itemsContainer-tv');
            }
            div.style.visibility = 'hidden';
            div.innerHTML = '<div class="' + cardClass + '"><div class="cardBox"><div class="cardScalable"></div></div></div>';

            var parent = document.body;
            parent.appendChild(div);

            width = cachedWidths[key] = div.querySelector('.cardScalable').offsetWidth;
            parent.removeChild(div);

            return width;
        }

        function isResizable(windowWidth) {

            var screen = window.screen;
            if (screen) {
                var screenWidth = screen.availWidth;

                if ((screenWidth - windowWidth) > 20) {
                    return true;
                }
            }

            return false;
        }

        function getDefaultShape(items, requestedShape) {

            var firstItem = items[0];

            if (firstItem) {
                switch (firstItem.Type) {

                    case 'Movie':
                    case 'SeriesTimer':
                        return 'portrait';
                    case 'Episode':
                    case 'Program':
                    case 'Video':
                        return 'backdrop';
                    default:
                        break;
                }
            }

            return 'square';
        }

        function setCardData(items, options) {

            var shape = options.shape || "auto";

            var primaryImageAspectRatio = imageLoader.getPrimaryImageAspectRatio(items, options);

            if (shape === 'auto' || shape === 'autohome' || shape === 'autooverflow' || shape === 'autoVertical') {

                var requestedShape = shape;
                shape = null;

                if (primaryImageAspectRatio) {

                    if (primaryImageAspectRatio >= 3) {
                        shape = 'banner';
                    } else if (primaryImageAspectRatio >= 1.4) {
                        shape = 'backdrop';
                    } else if (primaryImageAspectRatio > 1.2) {
                        shape = 'fourThree';
                    } else if (primaryImageAspectRatio > 0.71) {
                        shape = 'square';
                    } else {
                        shape = 'portrait';
                    }
                }

                if (!shape) {
                    shape = options.defaultShape || getDefaultShape(items, requestedShape);
                }
            }

            if (options.preferThumb === 'auto') {
                options.preferThumb = shape === 'backdrop';
            }

            options.uiAspect = getDesiredAspect(shape);
            options.primaryImageAspectRatio = primaryImageAspectRatio;

            if (!options.width && options.widths) {
                options.width = options.widths[shape];
            }

            if (options.rows && typeof (options.rows) !== 'number') {
                options.rows = options.rows[shape];
            }

            if (!options.width) {
                var screenWidth = dom.getWindowSize().innerWidth;

                var cardClass = 'card ' + shape + 'Card';

                if (options.cardClass) {
                    cardClass += ' ' + options.cardClass;
                }

                options.width = getImageWidth(shape, cardClass, screenWidth);

                if (isResizable(screenWidth)) {
                    var roundTo = 50;
                    options.width = Math.round(options.width / roundTo) * roundTo;
                }
            }

            var className = 'card';

            if (shape) {
                className += ' ' + shape + 'Card';
            }

            if (options.cardClass) {
                className += " " + options.cardClass;
            }

            var isLayoutTv = layoutManager.tv;

            if (!isLayoutTv) {
                className += ' card-hoverable';
            }

            var isSingleClickElement = isLayoutTv || options.hoverMenu === false;

            if (!enableFocusTransfrom || !isLayoutTv) {
                className += ' card-nofocustransform';
            }

            var tagName;
            if (isSingleClickElement) {
                tagName = 'button';
                className += " itemAction";
            } else {
                tagName = 'div';
            }

            var innerHTML = '<div class="cardBox"><div class="cardPadder-' + shape + ' cardScalable"><div class="cardContent cardImageContainer cardContent-shadow"></div></div></div>';

            options.templateInnerHTML = innerHTML;
            options.tagName = tagName;
            options.shape = shape;
            options.className = className;
            options.isSingleClickElement = isSingleClickElement;
        }

        function buildCardsHtmlInternal(items, options) {

            setCardData(items, options);

            var html = '';
            var itemsInRow = 0;
            var hasOpenRow;

            var rows = options.rows;

            for (var i = 0, length = items.length; i < length; i++) {

                var item = items[i];

                if (rows && itemsInRow === 0) {

                    if (hasOpenRow) {
                        html += '</div>';
                        hasOpenRow = false;
                    }

                    html += '<div class="cardColumn">';
                    hasOpenRow = true;
                }

                html += getCardHtml(item, options);

                itemsInRow++;

                if (rows && itemsInRow >= rows) {
                    html += '</div>';
                    hasOpenRow = false;
                    itemsInRow = 0;
                }
            }

            if (hasOpenRow) {
                html += '</div>';
            }

            return html;
        }

        function getDesiredAspect(shape) {

            if (shape) {
                shape = shape.toLowerCase();
                if (shape.indexOf('portrait') !== -1) {
                    return (2 / 3);
                }
                if (shape.indexOf('backdrop') !== -1) {
                    return (16 / 9);
                }
                if (shape.indexOf('square') !== -1) {
                    return 1;
                }
                if (shape.indexOf('fourthree') !== -1) {
                    return (4 / 3);
                }
                if (shape.indexOf('banner') !== -1) {
                    return (1000 / 185);
                }
            }
            return null;
        }

        function getCardImageUrl(item, apiClient, options, shape) {

            var uiAspect = options.uiAspect;

            if (item.ImageUrl) {
                return {
                    imgUrl: item.ImageUrl
                };
            }

            var imageItem;
            if (options.showCurrentProgramImage) {
                imageItem = item.CurrentProgram || item;
            }
            else {
                imageItem = item.ProgramInfo || item;
            }

            item = imageItem;

            var width = options.width;
            var height = null;
            var primaryImageAspectRatio = item.PrimaryImageAspectRatio;
            var forceName = false;
            var imgUrl = null;
            var coverImage = false;

            // .24 as opposed to .2 looks nice for nintendo 64
            var coverImageTolerance = 0.28;

            var imageTags = item.ImageTags;

            if (options.preferThumb && imageTags && imageTags.Thumb) {

                imgUrl = apiClient.getScaledImageUrl(item.Id, {
                    type: "Thumb",
                    maxWidth: width,
                    tag: imageTags.Thumb
                });

            } else if ((options.preferBanner || shape === 'banner') && imageTags && imageTags.Banner) {

                imgUrl = apiClient.getScaledImageUrl(item.Id, {
                    type: "Banner",
                    maxWidth: width,
                    tag: imageTags.Banner
                });

            } else if (options.preferDisc && imageTags && imageTags.Disc) {

                imgUrl = apiClient.getScaledImageUrl(item.Id, {
                    type: "Disc",
                    maxWidth: width,
                    tag: imageTags.Disc
                });

            } else if (options.preferLogo && imageTags && imageTags.Logo) {

                imgUrl = apiClient.getScaledImageUrl(item.Id, {
                    type: "Logo",
                    maxWidth: width,
                    tag: imageTags.Logo
                });

            } else if (options.preferLogo && item.ParentLogoImageTag && item.ParentLogoItemId) {

                imgUrl = apiClient.getScaledImageUrl(item.ParentLogoItemId, {
                    type: "Logo",
                    maxWidth: width,
                    tag: item.ParentLogoImageTag
                });

            } else if (options.preferThumb && item.ParentThumbItemId && options.inheritThumb !== false && item.MediaType !== 'Photo') {

                imgUrl = apiClient.getScaledImageUrl(item.ParentThumbItemId, {
                    type: "Thumb",
                    maxWidth: width,
                    tag: item.ParentThumbImageTag
                });

            } else if (options.preferThumb && item.BackdropImageTags && item.BackdropImageTags.length) {

                imgUrl = apiClient.getScaledImageUrl(item.Id, {
                    type: "Backdrop",
                    maxWidth: width,
                    tag: item.BackdropImageTags[0]
                });

                forceName = true;

            } else if (options.preferThumb && item.ParentBackdropImageTags && item.ParentBackdropImageTags.length && options.inheritThumb !== false && item.Type === 'Episode') {

                imgUrl = apiClient.getScaledImageUrl(item.ParentBackdropItemId, {
                    type: "Backdrop",
                    maxWidth: width,
                    tag: item.ParentBackdropImageTags[0]
                });

                if (options.preferThumb && options.showTitle !== false) {
                    forceName = true;
                }

            } else if (imageTags && imageTags.Primary) {

                height = width && primaryImageAspectRatio ? Math.round(width / primaryImageAspectRatio) : null;

                imgUrl = apiClient.getScaledImageUrl(item.Id, {
                    type: "Primary",
                    maxHeight: height,
                    maxWidth: width,
                    tag: imageTags.Primary
                });

                if (options.preferThumb && options.showTitle !== false) {
                    forceName = true;
                }

                if (primaryImageAspectRatio) {
                    if (uiAspect) {
                        coverImage = (Math.abs(primaryImageAspectRatio - uiAspect) / uiAspect) <= coverImageTolerance;
                    }
                }

            } else if (item.ImageTag && item.Type === 'Plugin') {

                imgUrl = apiClient.getUrl('Plugins/' + item.Id + '/Thumb', {
                    maxHeight: height,
                    maxWidth: width,
                    tag: item.ImageTag
                });

                if (primaryImageAspectRatio) {
                    if (uiAspect) {
                        coverImage = (Math.abs(primaryImageAspectRatio - uiAspect) / uiAspect) <= coverImageTolerance;
                    }
                }

            } else if (item.PrimaryImageTag) {

                height = width && primaryImageAspectRatio ? Math.round(width / primaryImageAspectRatio) : null;

                if (item.Type === 'User') {

                    imgUrl = apiClient.getUserImageUrl(item.Id, {
                        maxHeight: height,
                        maxWidth: width,
                        tag: item.PrimaryImageTag,
                        type: "Primary"
                    });

                } else {
                    imgUrl = apiClient.getScaledImageUrl(item.PrimaryImageItemId || item.Id || item.ItemId, {
                        type: "Primary",
                        maxHeight: height,
                        maxWidth: width,
                        tag: item.PrimaryImageTag
                    });

                    if (options.preferThumb && options.showTitle !== false) {
                        forceName = true;
                    }
                }

                if (primaryImageAspectRatio) {
                    if (uiAspect) {
                        coverImage = (Math.abs(primaryImageAspectRatio - uiAspect) / uiAspect) <= coverImageTolerance;
                    }
                }
            }
            else if (item.ParentThumbItemId && options.inheritThumb !== false && uiAspect && uiAspect >= 1.4 && item.MediaType !== 'Photo') {

                imgUrl = apiClient.getScaledImageUrl(item.ParentThumbItemId, {
                    type: "Thumb",
                    maxWidth: width,
                    tag: item.ParentThumbImageTag
                });

            } else if (item.ParentPrimaryImageTag) {

                imgUrl = apiClient.getScaledImageUrl(item.ParentPrimaryImageItemId, {
                    type: "Primary",
                    maxWidth: width,
                    tag: item.ParentPrimaryImageTag
                });
            }
            else if (item.SeriesPrimaryImageTag) {

                imgUrl = apiClient.getScaledImageUrl(item.SeriesId, {
                    type: "Primary",
                    maxWidth: width,
                    tag: item.SeriesPrimaryImageTag
                });
            }
            else if (item.AlbumId && item.AlbumPrimaryImageTag) {

                width = primaryImageAspectRatio ? Math.round(height * primaryImageAspectRatio) : null;

                imgUrl = apiClient.getScaledImageUrl(item.AlbumId, {
                    type: "Primary",
                    maxHeight: height,
                    maxWidth: width,
                    tag: item.AlbumPrimaryImageTag
                });

                if (primaryImageAspectRatio) {
                    if (uiAspect) {
                        coverImage = (Math.abs(primaryImageAspectRatio - uiAspect) / uiAspect) <= coverImageTolerance;
                    }
                }
            }
            else if (item.Type === 'Season' && imageTags && imageTags.Thumb) {

                imgUrl = apiClient.getScaledImageUrl(item.Id, {
                    type: "Thumb",
                    maxWidth: width,
                    tag: imageTags.Thumb
                });

            }
            else if (item.BackdropImageTags && item.BackdropImageTags.length) {

                imgUrl = apiClient.getScaledImageUrl(item.Id, {
                    type: "Backdrop",
                    maxWidth: width,
                    tag: item.BackdropImageTags[0]
                });

            } else if (imageTags && imageTags.Thumb) {

                imgUrl = apiClient.getScaledImageUrl(item.Id, {
                    type: "Thumb",
                    maxWidth: width,
                    tag: imageTags.Thumb
                });

            } else if (item.ParentThumbItemId && options.inheritThumb !== false) {

                imgUrl = apiClient.getScaledImageUrl(item.ParentThumbItemId, {
                    type: "Thumb",
                    maxWidth: width,
                    tag: item.ParentThumbImageTag
                });

            } else if (item.ParentBackdropImageTags && item.ParentBackdropImageTags.length && options.inheritThumb !== false) {

                imgUrl = apiClient.getScaledImageUrl(item.ParentBackdropItemId, {
                    type: "Backdrop",
                    maxWidth: width,
                    tag: item.ParentBackdropImageTags[0]
                });

            } else if (item.PrimaryImageItemId) {

                // VirtualFolder
                imgUrl = apiClient.getScaledImageUrl(item.PrimaryImageItemId, {
                    type: "Primary",
                    maxHeight: height,
                    maxWidth: width
                });

            }

            return {
                imgUrl: imgUrl,
                forceName: forceName,
                coverImage: coverImage
            };
        }

        function getRandomInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        var numRandomColors = 5;
        function getDefaultColorIndex(str) {

            if (str) {
                var charIndex = Math.floor(str.length / 2);
                var character = String(str.substr(charIndex, 1).charCodeAt());
                var sum = 0;
                for (var i = 0; i < character.length; i++) {
                    sum += parseInt(character.charAt(i));
                }
                var index = String(sum).substr(-1);

                return (index % numRandomColors) + 1;
            } else {
                return getRandomInt(1, numRandomColors);
            }
        }

        function getCardTextLines(lines, cssClass, forceLines, isOuterFooter, cardLayout, addRightMargin, maxLines) {

            var html = '';

            var valid = 0;
            var i, length;
            var currentCssClass = cssClass;

            for (i = 0, length = lines.length; i < length; i++) {

                currentCssClass = cssClass;
                var text = lines[i];

                if (valid > 0 && isOuterFooter) {
                    currentCssClass += ' cardText-secondary';
                } else if (valid === 0 && isOuterFooter) {
                    currentCssClass += ' cardText-first';
                }

                if (addRightMargin) {
                    currentCssClass += ' cardText-rightmargin';
                }

                if (text) {
                    html += '<div class="' + currentCssClass + '">';
                    html += text;
                    html += "</div>";
                    valid++;

                    if (maxLines && valid >= maxLines) {
                        break;
                    }
                }
            }

            if (forceLines) {

                length = maxLines || Math.min(lines.length, maxLines || lines.length);

                while (valid < length) {

                    currentCssClass = cssClass;
                    if (valid > 0 && isOuterFooter) {
                        currentCssClass += ' cardText-secondary';
                    }

                    html += '<div class="' + currentCssClass + '">&nbsp;</div>';
                    valid++;
                }
            }

            return html;
        }

        function isUsingLiveTvNaming(itemType) {

            return itemType === 'Program' || itemType === 'Timer' || itemType === 'Recording';
        }

        function getAirTimeText(item, showAirDateTime, showAirEndTime) {

            var airTimeText = '';
            if (item.StartDate) {

                try {
                    var date = datetime.parseISO8601Date(item.StartDate);

                    if (showAirDateTime) {
                        airTimeText += datetime.toLocaleDateString(date, { weekday: 'short', month: 'short', day: 'numeric' }) + ' ';
                    }

                    airTimeText += datetime.getDisplayTime(date);

                    if (item.EndDate && showAirEndTime) {
                        date = datetime.parseISO8601Date(item.EndDate);
                        airTimeText += ' &ndash; ' + datetime.getDisplayTime(date);
                    }
                }
                catch (e) {
                    console.log("Error parsing date: " + item.StartDate);
                }
            }

            return airTimeText;
        }

        function getCardFooterText(item, options, showTitle, forceName, overlayText, imgUrl, footerClass, progressHtml, logoUrl, isOuterFooter) {

            var itemType = item.Type;

            var html = '';

            if (logoUrl) {
                html += '<div class="lazy cardFooterLogo" loading="lazy" style="background-image:url(' + logoUrl + ');"></div>';
            }

            var showOtherText = isOuterFooter ? !overlayText : overlayText;

            if (isOuterFooter && options.cardLayout && !layoutManager.tv && options.cardFooterAside !== false) {

                // Checking item.Id for Type == AddServer
                if (item.Type !== 'Program' && item.Id) {
                    html += '<button type="button" is="paper-icon-button-light" class="itemAction btnCardOptions cardText-secondary" data-action="menu"><i class="md-icon">&#xE5D3;</i></button>';
                }
            }

            var cssClass = options.centerText ? "cardText cardTextCentered" : "cardText";

            var lines = [];
            var parentTitleUnderneath = itemType === 'MusicAlbum' || itemType === 'Audio' || itemType === 'MusicVideo' || itemType === 'Game';
            var titleAdded;

            var serverId = item.ServerId || options.serverId;

            if (showOtherText) {
                if ((options.showParentTitle || options.showParentTitleOrTitle || (forceName && options.seriesNameInPlaceHolderName)) && !parentTitleUnderneath) {

                    if (isOuterFooter && itemType === 'Episode' && item.SeriesName) {

                        if (item.SeriesId) {
                            lines.push(getTextActionButton(options, {
                                Id: item.SeriesId,
                                ServerId: serverId,
                                Name: item.SeriesName,
                                Type: 'Series',
                                IsFolder: true
                            }));
                        } else {
                            lines.push(dom.htmlEncode(item.SeriesName));
                        }
                    }
                    else {

                        if (isUsingLiveTvNaming(itemType)) {

                            lines.push(dom.htmlEncode(item.Name));

                            if (!item.EpisodeTitle) {
                                titleAdded = true;
                            }

                        } else {
                            var parentTitle = item.SeriesName || item.Series || item.Album || item.AlbumArtist || item.GameSystem || "";

                            if (parentTitle || showTitle) {
                                lines.push(dom.htmlEncode(parentTitle));
                            }
                        }
                    }
                }
            }

            var showMediaTitle = (showTitle && !titleAdded) || (options.showParentTitleOrTitle && !lines.length);
            if (!showMediaTitle && !titleAdded && (showTitle || (forceName && !options.seriesNameInPlaceHolderName))) {
                showMediaTitle = true;
            }

            if (showMediaTitle) {

                var name = options.showTitle === 'auto' && !item.IsFolder && item.MediaType === 'Photo' ? '' : itemHelper.getDisplayName(item, {
                    includeParentInfo: options.includeParentInfoInTitle
                });

                if (overlayText) {
                    lines.push(dom.htmlEncode(name));
                } else {
                    lines.push(getTextActionButton(options, item, name, serverId, options.parentId, true));
                }
            }

            if (showOtherText) {
                if (options.showParentTitle && parentTitleUnderneath) {

                    if (isOuterFooter && item.AlbumArtists && item.AlbumArtists.length && itemType === 'MusicAlbum') {
                        item.AlbumArtists[0].Type = 'MusicArtist';
                        item.AlbumArtists[0].IsFolder = true;
                        lines.push(getTextActionButton(options, item.AlbumArtists[0], null, serverId));
                    } else if (isOuterFooter && item.ArtistItems && item.ArtistItems.length) {
                        item.ArtistItems[0].Type = 'MusicArtist';
                        item.ArtistItems[0].IsFolder = true;
                        lines.push(getTextActionButton(options, item.ArtistItems[0], null, serverId));
                    } else if (isOuterFooter && item.AlbumArtists && item.AlbumArtists.length) {
                        item.AlbumArtists[0].Type = 'MusicArtist';
                        item.AlbumArtists[0].IsFolder = true;
                        lines.push(getTextActionButton(options, item.AlbumArtists[0], null, serverId));
                    } else if (isOuterFooter && item.GameSystem && item.GameSystemId) {
                        lines.push(getTextActionButton(options, {
                            Id: item.GameSystemId,
                            ServerId: serverId,
                            Name: item.GameSystem,
                            Type: 'GameSystem',
                            IsFolder: true
                        }));
                    } else {
                        lines.push(dom.htmlEncode(isUsingLiveTvNaming(itemType) ? item.Name : (item.SeriesName || item.Series || item.Album || item.AlbumArtist || item.GameSystem || "")));
                    }
                }

                if (options.textLines) {
                    var additionalLines = options.textLines(item);
                    for (var i = 0, length = additionalLines.length; i < length; i++) {
                        lines.push(additionalLines[i]);
                    }
                }

                if (options.showYear) {

                    if (itemType === 'Series') {
                        if (item.Status === "Continuing") {

                            lines.push(globalize.translate('SeriesYearToPresent', item.ProductionYear || ''));

                        } else {

                            var endYear = item.EndDate ? datetime.parseISO8601Date(item.EndDate).getFullYear() : null;

                            if (endYear && item.ProductionYear && endYear !== item.ProductionYear) {
                                lines.push(item.ProductionYear + ' &ndash; ' + endYear);
                            } else {
                                lines.push(item.ProductionYear || '');
                            }
                        }
                    } else {
                        lines.push(item.ProductionYear || '');
                    }
                }

                if (options.showRuntime) {

                    if (item.RunTimeTicks) {

                        lines.push(datetime.getDisplayRunningTime(item.RunTimeTicks));
                    } else {
                        lines.push('');
                    }
                }

                if (options.showAirTime) {

                    lines.push(getAirTimeText(item, options.showAirDateTime, options.showAirEndTime) || '');
                }

                if (options.showChannelName) {

                    if (item.ChannelId) {

                        lines.push(getTextActionButton(options, {

                            Id: item.ChannelId,
                            ServerId: serverId,
                            Name: item.ChannelName,
                            Type: 'TvChannel',
                            MediaType: item.MediaType,
                            IsFolder: false

                        }, item.ChannelName));
                    } else {
                        lines.push(item.ChannelName || '&nbsp;');
                    }
                }

                if (options.showCurrentProgramParentTitle && itemType === 'TvChannel') {

                    if (item.CurrentProgram) {
                        lines.push(item.CurrentProgram.Name || '');
                    } else {
                        lines.push('');
                    }
                }

                if (options.showCurrentProgramTitle && itemType === 'TvChannel') {

                    if (item.CurrentProgram) {
                        lines.push(item.CurrentProgram.EpisodeTitle || '');
                    } else {
                        lines.push('');
                    }
                }

                if (options.showCurrentProgramTime && itemType === 'TvChannel') {

                    if (item.CurrentProgram) {
                        lines.push(getAirTimeText(item.CurrentProgram, false, true) || '');
                    } else {
                        lines.push('');
                    }
                }

                if (options.showSeriesTimerTime) {
                    if (item.RecordAnyTime) {

                        lines.push(globalize.translate('Anytime'));
                    } else {
                        lines.push(datetime.getDisplayTime(item.StartDate));
                    }
                }

                if (options.showSeriesTimerChannel) {
                    if (item.RecordAnyChannel) {
                        lines.push(globalize.translate('AllChannels'));
                    }
                    else {
                        lines.push(item.ChannelName || globalize.translate('OneChannel'));
                    }
                }

                if (options.showPersonRoleOrType) {
                    if (item.Role) {
                        lines.push(globalize.translate('ActorAsRole', item.Role));
                    }
                    else if (itemType) {
                        lines.push(globalize.translate('' + itemType));
                    } else {
                        lines.push('');
                    }
                }

                if (options.showChapterTime) {
                    lines.push(datetime.getDisplayRunningTime(item.StartPositionTicks));
                }

                if (options.showUserLastSeen) {

                    if (item.Policy.IsDisabled) {
                        lines.push(globalize.translate('Disabled'));
                    } else {
                        lines.push(item.LastActivityDate ? humanedate(item.LastActivityDate) : '');
                    }
                }

                if (options.showContentType) {

                    if (!item.Id) {
                        // AddVirtualFolder
                        lines.push('');
                    } else {
                        lines.push(itemHelper.getContentTypeName(item.CollectionType));
                    }
                }

                if (options.showLibraryFolders) {
                    if (!item.Locations) {

                        lines.push('');

                    } else if (item.Locations.length === 1) {
                        lines.push(item.Locations[0]);
                    }
                    else {
                        lines.push(globalize.translate('NumLocationsValue', item.Locations.length));
                    }
                }

                if (options.showDeviceAppInfo) {
                    lines.push(item.AppName + ' ' + item.AppVersion);
                }

                if (options.showVersion) {
                    lines.push(item.Version || '');
                }

                if (options.showDeviceUserInfo) {
                    var deviceHtml = '';
                    if (item.LastUserName) {
                        if (item.LastUserId) {

                            deviceHtml += getTextActionButton(options, {
                                Id: item.LastUserId,
                                Name: item.LastUserName,
                                ServerId: serverId,
                                Type: 'User'
                            }, item.LastUserName + ', ' + humanedate(item.DateLastActivity), null, null);

                        } else if (item.LastUserName) {
                            deviceHtml += item.LastUserName + ', ' + humanedate(item.DateLastActivity);
                        }
                    }
                    lines.push(deviceHtml);
                }
            }

            if ((showTitle || !imgUrl) && forceName && overlayText && lines.length === 1) {
                lines = [];
            }

            var addRightTextMargin = isOuterFooter && options.cardLayout && options.cardFooterAside !== false && !layoutManager.tv;

            html += getCardTextLines(lines, cssClass, !overlayText, isOuterFooter, options.cardLayout, addRightTextMargin, options.lines);

            if (progressHtml) {
                html += progressHtml;
            }

            if (html) {

                if (!isOuterFooter || logoUrl || options.cardLayout) {
                    html = '<div class="' + footerClass + '">' + html;

                    //cardFooter
                    html += "</div>";
                }
            }

            return html;
        }

        function getTextActionButton(options, item, text, serverId, parentId, isSameItemAsCard) {

            if (!text) {
                text = itemHelper.getDisplayName(item);
            }

            if (layoutManager.tv) {
                return dom.htmlEncode(text);
            }

            if (options.textLinks === false) {
                return dom.htmlEncode(text);
            }

            text = dom.htmlEncode(text);

            var dataAttributes;

            if (isSameItemAsCard) {
                dataAttributes = '';
            }
            else {
                dataAttributes = itemShortcuts.getShortcutAttributesHtml(item, {
                    serverId: serverId,
                    parentId: parentId
                });
            }

            var html = '<button title="' + text + '" ' + dataAttributes + ' type="button" class="itemAction textActionButton cardTextActionButton" data-action="link">';
            html += text;
            html += '</button>';

            return html;
        }

        var refreshIndicatorLoaded;
        function requireRefreshIndicator() {

            if (!refreshIndicatorLoaded) {
                refreshIndicatorLoaded = true;
                require(['emby-itemrefreshindicator']);
            }
        }

        function getDefaultBackgroundClass(str) {
            return 'defaultCardBackground defaultCardBackground' + getDefaultColorIndex(str);
        }

        function getCardHtml(item, options) {

            var itemType = item.Type;
            var action = options.action || 'link';

            if (!item.Id) {
                // AddServer
                action = 'link';
            }
            else if (item.IsFolder && action === 'play') {
                // If this hard-coding is ever removed make sure to test nested photo albums
                action = 'link';
            }
            else if (item.MediaType === 'Photo') {
                action = 'playallfromhere';
            }

            var shape = options.shape;

            var isSingleClickElement = options.isSingleClickElement;

            var serverId = item.ServerId || options.serverId;
            var apiClient = serverId ? connectionManager.getApiClient(serverId) : null;

            var imgInfo = getCardImageUrl(item, apiClient, options, shape);
            var imgUrl = imgInfo.imgUrl;

            var forceName = imgInfo.forceName;

            var overlayText = options.overlayText;

            if (forceName && !options.cardLayout) {

                if (overlayText == null) {
                    overlayText = true;
                }
            }

            var showTitle = options.showTitle === 'auto' ? true : (options.showTitle || (overlayText && (itemType === 'PhotoAlbum' || itemType === 'Folder')));

            var cardImageContainerClass = 'cardImageContainer';
            var coveredImage = options.coverImage || imgInfo.coverImage;

            if (coveredImage) {
                cardImageContainerClass += ' coveredImage';

                if (item.MediaType === 'Photo' || itemType === 'PhotoAlbum' || itemType === 'Folder' || itemType === 'Program' || itemType === 'Recording' || itemType === 'TvChannel') {
                    cardImageContainerClass += ' coveredImage-noScale';
                }
            }

            if (item.Policy && item.Policy.IsDisabled) {
                cardImageContainerClass += ' grayscaleImage';
            }

            if (options.paddedImage) {
                cardImageContainerClass += ' paddedImage';
            }

            if (options.defaultBackground) {
                cardImageContainerClass += ' defaultCardBackground defaultCardBackground0';
            }
            else if (!imgUrl) {
                cardImageContainerClass += ' ' + getDefaultBackgroundClass(item.Name);
            }

            var cardBoxClass = options.cardLayout ? 'cardBox visualCardBox' : 'cardBox';

            var isLayoutTv = layoutManager.tv;
            if (isLayoutTv) {

                if (enableFocusTransfrom) {
                    cardBoxClass += ' cardBox-focustransform cardBox-withfocuscontent';
                } else {
                    cardBoxClass += ' cardBox-withfocuscontent-large';
                }

                if (options.cardLayout) {
                    cardBoxClass += ' card-focuscontent';

                    if (!enableFocusTransfrom) {
                        cardBoxClass += ' card-focuscontent-large';
                    }
                }
            }

            if (isSingleClickElement) {

            } else {

                if (!options.centerPlayButton) {
                    cardBoxClass += ' cardBox-touchzoom';
                }
            }

            var playlistItemId = options.playlistItemId;
            if (playlistItemId && playlistItemId === item.PlaylistItemId) {
                cardBoxClass += ' activePlaylistCardBox';
            }

            var footerCssClass;
            var progressHtml = indicators.getProgressBarHtml(item);

            var innerCardFooter = '';

            var footerOverlayed = false;

            var logoUrl;
            var logoHeight = 40;

            if (options.showChannelLogo && item.ChannelPrimaryImageTag) {
                logoUrl = apiClient.getScaledImageUrl(item.ChannelId, {
                    type: "Primary",
                    height: logoHeight,
                    tag: item.ChannelPrimaryImageTag
                });
            }
            else if (options.showLogo && item.ParentLogoImageTag) {
                logoUrl = apiClient.getScaledImageUrl(item.ParentLogoItemId, {
                    type: "Logo",
                    height: logoHeight,
                    tag: item.ParentLogoImageTag
                });
            }

            if (overlayText) {

                logoUrl = null;

                footerCssClass = progressHtml ? 'innerCardFooter fullInnerCardFooter' : 'innerCardFooter';
                innerCardFooter += getCardFooterText(item, options, showTitle, forceName, overlayText, imgUrl, footerCssClass, progressHtml, logoUrl, false);
                footerOverlayed = true;
            }
            else if (progressHtml) {
                innerCardFooter += '<div class="innerCardFooter fullInnerCardFooter innerCardFooterClear">';
                innerCardFooter += progressHtml;
                innerCardFooter += '</div>';

                progressHtml = '';
            }

            var outerCardFooter = '';
            if (!overlayText && !footerOverlayed) {
                footerCssClass = options.cardLayout ? 'cardFooter' : 'cardFooter cardFooter-transparent';

                if (logoUrl) {
                    footerCssClass += ' cardFooter-withlogo';
                }

                if (!options.cardLayout) {
                    logoUrl = null;
                }

                outerCardFooter = getCardFooterText(item, options, showTitle, forceName, overlayText, imgUrl, footerCssClass, progressHtml, logoUrl, true);
            }

            if (outerCardFooter && !options.cardLayout /*&& options.allowBottomPadding !== false*/) {
                cardBoxClass += ' cardBox-bottompadded';
            }

            // cardBox can be it's own separate element if an outer footer is ever needed
            var cardImageContainerOpen;
            var cardImageContainerClose = '';
            var cardScalableClose = '</div>';

            var cardContentClass = 'cardContent';
            if (!options.cardLayout) {
                cardContentClass += ' cardContent-shadow';
            }

            if (imgUrl) {

                if (options.lazy !== 2) {
                    cardContentClass += ' lazy';
                }
            }

            if (isSingleClickElement) {

                // Don't use the IMG tag with safari because it puts a white border around it
                cardImageContainerOpen = imgUrl ? ('<div class="' + cardImageContainerClass + ' ' + cardContentClass + '" loading="lazy" style="background-image:url(' + imgUrl + ');">') : ('<div class="' + cardImageContainerClass + ' ' + cardContentClass + '">');

                cardImageContainerClose = '</div>';
            } else {

                // Don't use the IMG tag with safari because it puts a white border around it
                cardImageContainerOpen = imgUrl ? ('<button type="button" data-action="' + action + '" class="itemAction cardContent-button ' + cardImageContainerClass + ' ' + cardContentClass + '" loading="lazy" style="background-image:url(' + imgUrl + ');">') : ('<button type="button" data-action="' + action + '" class="cardContent-button ' + cardImageContainerClass + ' ' + cardContentClass + ' itemAction">');

                cardImageContainerClose = '</button>';
            }

            var cardScalableClass = 'cardScalable';

            if (isSingleClickElement && !options.cardLayout) {

                cardScalableClass += ' card-focuscontent';

                if (!enableFocusTransfrom) {
                    cardScalableClass += ' card-focuscontent-large';
                }
            }

            cardImageContainerOpen = '<div class="' + cardBoxClass + '"><div class="cardPadder-' + shape + ' ' + cardScalableClass + '">' + cardImageContainerOpen;

            cardImageContainerOpen += indicators.getTypeIndicator(item);

            var indicatorsHtml = '';

            if (options.missingIndicator !== false) {
                indicatorsHtml += indicators.getMissingIndicator(item);
            }

            indicatorsHtml += indicators.getSyncIndicator(item);
            indicatorsHtml += indicators.getTimerIndicator(item);

            indicatorsHtml += indicators.getPlayedIndicatorHtml(item);

            if (itemType === 'CollectionFolder' || item.CollectionType) {
                var refreshClass = item.RefreshProgress ? '' : ' class="hide"';
                indicatorsHtml += '<div is="emby-itemrefreshindicator"' + refreshClass + ' data-progress="' + (item.RefreshProgress || 0) + '" data-status="' + item.RefreshStatus + '"></div>';
                requireRefreshIndicator();
            }
            else if (itemType === 'User' && item.ConnectLinkType) {

                indicatorsHtml += '<div title="' + globalize.translate('LinkedToEmbyConnect') + '" class="playedIndicator indicator"><i class="md-icon indicatorIcon">cloud</i></div>';
            }

            if (indicatorsHtml) {
                cardImageContainerOpen += '<div class="cardIndicators">' + indicatorsHtml + '</div>';
            }

            //if (itemType === 'Program' || itemType === 'Timer') {
            //    cardImageContainerOpen += getProgramIndicators(item);
            //}

            if (!imgUrl) {
                cardImageContainerOpen += getCardDefaultText(item, options);
            }

            var tagName = options.tagName;

            var additionalCardContent = '';

            if (layoutManager.desktop && options.hoverMenu !== false) {
                additionalCardContent += getHoverMenuHtml(item, action, options);
            }

            if (options.cardParts) {

                var attributes = itemShortcuts.getShortcutAttributes(item, options);

                if (options.isSingleClickElement) {
                    attributes.push({ name: 'data-action', value: action });
                }

                return {
                    attributes: attributes,
                    html: cardImageContainerOpen + innerCardFooter + cardImageContainerClose + additionalCardContent + cardScalableClose + outerCardFooter + '</div>'
                };
            }

            var dataAttributes = itemShortcuts.getShortcutAttributesHtml(item, options);

            if (options.isSingleClickElement) {
                dataAttributes += ' data-action="' + action + '"';
            }

            return '<' + tagName + dataAttributes + ' class="' + options.className + '">' + cardImageContainerOpen + innerCardFooter + cardImageContainerClose + additionalCardContent + cardScalableClose + outerCardFooter + '</div></' + tagName + '>';
        }

        function getCardParts(item, options) {

            options.cardParts = true;
            return getCardHtml(item, options);
        }

        function getHoverMenuHtml(item, action, options) {

            var html = '';
            var hasContent = false;

            html += '<div class="cardOverlayContainer itemAction" data-action="' + action + '">';

            var btnCssClass = 'cardOverlayButton cardOverlayButton-hover itemAction';

            var serverId = item.ServerId || options.serverId;
            var itemType = item.Type;
            var itemId = item.Id;

            if (options.multiSelect !== false) {
                hasContent = true;
                html += '<label data-action="multiselect" data-id="' + itemId + '" data-serverid="' + serverId + '"  class="chkCardSelectContainer cardOverlayButton cardOverlayButton-hover itemAction emby-checkbox-label"><input class="chkCardSelect emby-checkbox" is="emby-checkbox" type="checkbox" data-classes="true" /><span class="checkboxLabel"></span></label>';
            }

            if (playbackManager.canPlay(item) && options.hoverPlayButton !== false) {

                hasContent = true;

                var playButtonAction = item.IsFolder ? 'resume' : (options.playAction || 'play');
                html += '<button type="button" is="paper-icon-button-light" class="' + btnCssClass + ' cardOverlayFab-primary" data-action="' + playButtonAction + '"><i class="md-icon cardOverlayButtonIcon">&#xE037;</i></button>';
            }

            html += '<div class="cardOverlayButton-br">';

            //if (itemHelper.canEdit({ Policy: { IsAdministrator: true } }, item)) {

            //    html += '<button type="button" is="paper-icon-button-light" class="' + btnCssClass + '" data-action="edit"><i class="md-icon cardOverlayButtonIcon cardOverlayButtonIcon-hover">&#xE254;</i></button>';
            //}

            var userData = item.UserData || {};

            if (options.playedButton !== false && itemHelper.canMarkPlayed(item)) {

                hasContent = true;

                html += '<button is="emby-playstatebutton" type="button" data-action="none" class="' + btnCssClass + '" data-id="' + itemId + '" data-serverid="' + serverId + '" data-itemtype="' + itemType + '" data-played="' + (userData.Played) + '"><i class="md-icon cardOverlayButtonIcon cardOverlayButtonIcon-hover">&#xE5CA;</i></button>';
            }

            if (options.ratingButton !== false && itemHelper.canRate(item)) {

                var likes = userData.Likes == null ? '' : userData.Likes;

                hasContent = true;

                html += '<button is="emby-ratingbutton" type="button" data-action="none" class="' + btnCssClass + '" data-id="' + itemId + '" data-serverid="' + serverId + '" data-itemtype="' + itemType + '" data-likes="' + likes + '" data-isfavorite="' + (userData.IsFavorite) + '"><i class="md-icon cardOverlayButtonIcon cardOverlayButtonIcon-hover">&#xE87D;</i></button>';
            }

            // Checking item.Id for Type == AddServer
            if (options.moreButton !== false && item.Type !== 'Program' && item.Id) {
                hasContent = true;

                html += '<button type="button" is="paper-icon-button-light" class="' + btnCssClass + '" data-action="menu"><i class="md-icon cardOverlayButtonIcon cardOverlayButtonIcon-hover">&#xE5D3;</i></button>';
            }

            if (!hasContent) {
                return '';
            }

            html += '</div>';
            html += '</div>';

            return html;
        }

        var defaultIconsByItemType = {
            MusicAlbum: '&#xE019;',
            MusicArtist: '&#xE7FD;',
            Person: '&#xE7FD;',
            Channel: '&#xE2C7;',
            Device: 'devices',
            User: '&#xe7fd;',
            Server: '&#xE63E;',
            SelectServer: '&#xE63E;',
            ManualLogin: '&#xe898;',
            Downloads: 'folder',
            ForgotPassword: '&#xe887;',
            AddServer: '&#xe147;',
            AddVirtualFolder: '&#xe147;'
        };

        var defaultIconsByCollectionType = {
            movies: '&#xE54D;',
            music: '&#xE310;',
            homevideos: '&#xE412;',
            photos: '&#xE412;',
            livetv: '&#xe1b2;',
            tvshows: '&#xE639;',
            games: '&#xe30f;',
            trailers: '&#xE54D;',
            musicvideos: '&#xE04A;',
            books: '&#xE2C7;',
            channels: '&#xE2C7;',
            playlists: '&#xE5D2;'
        };

        function getDefaultIcon(item, defaultIcon) {

            var icon;

            var collectionType = item.CollectionType;
            if (collectionType) {
                icon = defaultIconsByCollectionType[collectionType];
                if (icon) {
                    return icon;
                }
            }

            var itemType = item.Type;
            if (itemType) {
                icon = defaultIconsByItemType[itemType];
                if (icon) {
                    return icon;
                }
            }

            if (defaultIcon === false) {
                return null;
            }

            if (typeof defaultIcon === 'string') {
                return defaultIcon;
            }

            return "&#xE2C7;";
        }

        function getCardDefaultText(item, options) {

            var icon = getDefaultIcon(item, options.defaultCardImageIcon || false);

            if (icon) {
                return '<i class="cardImageIcon md-icon">' + icon + '</i>';
            }

            var defaultName = isUsingLiveTvNaming(item.Type) ? item.Name : itemHelper.getDisplayName(item);
            return '<div class="cardText cardDefaultText">' + defaultName + '</div>';
        }

        function buildCards(items, options) {

            // Abort if the container has been disposed
            var itemsContainer = options.itemsContainer;
            if (!document.body.contains(itemsContainer)) {
                return;
            }

            var parentContainer = options.parentContainer;
            if (parentContainer) {
                if (items.length) {
                    parentContainer.classList.remove('hide');
                } else {
                    parentContainer.classList.add('hide');
                    return;
                }
            }

            var html = buildCardsHtmlInternal(items, options);

            if (html) {

                if (itemsContainer.cardBuilderHtml !== html) {
                    itemsContainer.innerHTML = html;

                    if (items.length < 50) {
                        itemsContainer.cardBuilderHtml = html;
                    } else {
                        itemsContainer.cardBuilderHtml = null;
                    }
                }

                imageLoader.lazyChildren(itemsContainer);
            } else {

                itemsContainer.innerHTML = html;
                itemsContainer.cardBuilderHtml = null;
            }

            if (options.autoFocus) {
                focusManager.autoFocus(itemsContainer);
            }
        }

        function ensureIndicators(card, indicatorsElem) {

            if (indicatorsElem) {
                return indicatorsElem;
            }

            indicatorsElem = card.querySelector('.cardIndicators');

            if (!indicatorsElem) {

                var cardImageContainer = card.querySelector('.cardImageContainer');
                indicatorsElem = document.createElement('div');
                indicatorsElem.classList.add('cardIndicators');
                cardImageContainer.appendChild(indicatorsElem);
            }

            return indicatorsElem;
        }

        function updateUserData(card, userData) {

            var type = card.getAttribute('data-type');

            if (type === 'MusicArtist' || type === 'MusicAlbum' || type === 'Audio') {
                return;
            }

            // avoid updating chapter cards with watched marks
            if (card.getAttribute('data-startpositionticks')) {
                return;
            }

            var enableCountIndicator = type === 'Series' || type === 'BoxSet' || type === 'Season';
            var indicatorsElem = null;
            var playedIndicator = null;
            var countIndicator = null;
            var itemProgressBar = null;

            if (userData.Played) {

                playedIndicator = card.querySelector('.playedIndicator');

                if (!playedIndicator) {

                    playedIndicator = document.createElement('div');
                    playedIndicator.classList.add('playedIndicator');
                    playedIndicator.classList.add('indicator');
                    indicatorsElem = ensureIndicators(card, indicatorsElem);
                    indicatorsElem.appendChild(playedIndicator);
                }
                playedIndicator.innerHTML = '<i class="md-icon indicatorIcon">&#xE5CA;</i>';
            } else {

                playedIndicator = card.querySelector('.playedIndicator');
                if (playedIndicator) {

                    playedIndicator.parentNode.removeChild(playedIndicator);
                }
            }
            if (userData.UnplayedItemCount) {
                countIndicator = card.querySelector('.countIndicator');

                if (!countIndicator) {

                    countIndicator = document.createElement('div');
                    countIndicator.classList.add('countIndicator');
                    indicatorsElem = ensureIndicators(card, indicatorsElem);
                    indicatorsElem.appendChild(countIndicator);
                }
                countIndicator.innerHTML = userData.UnplayedItemCount;
            } else if (enableCountIndicator) {

                countIndicator = card.querySelector('.countIndicator');
                if (countIndicator) {

                    countIndicator.parentNode.removeChild(countIndicator);
                }
            }

            var progressHtml = indicators.getProgressBarHtml({
                Type: type,
                UserData: userData,
                MediaType: 'Video'
            });

            if (progressHtml) {

                itemProgressBar = card.querySelector('.itemProgressBar');

                if (!itemProgressBar) {
                    itemProgressBar = document.createElement('div');
                    itemProgressBar.classList.add('itemProgressBar');

                    var innerCardFooter = card.querySelector('.innerCardFooter');
                    if (!innerCardFooter) {
                        innerCardFooter = document.createElement('div');
                        innerCardFooter.classList.add('innerCardFooter');
                        var cardImageContainer = card.querySelector('.cardImageContainer');
                        cardImageContainer.appendChild(innerCardFooter);
                    }
                    innerCardFooter.appendChild(itemProgressBar);
                }

                itemProgressBar.innerHTML = progressHtml;
            }
            else {

                itemProgressBar = card.querySelector('.itemProgressBar');
                if (itemProgressBar) {
                    itemProgressBar.parentNode.removeChild(itemProgressBar);
                }
            }
        }

        function onUserDataChanged(userData, scope) {

            var cards = (scope || document.body).querySelectorAll('.card[data-id="' + userData.ItemId + '"]');

            for (var i = 0, length = cards.length; i < length; i++) {
                updateUserData(cards[i], userData);
            }
        }

        function onTimerCreated(programId, newTimerId, itemsContainer) {

            var cells = itemsContainer.querySelectorAll('.card[data-id="' + programId + '"]');

            for (var i = 0, length = cells.length; i < length; i++) {
                var cell = cells[i];
                var icon = cell.querySelector('.timerIndicator');
                if (!icon) {
                    var indicatorsElem = ensureIndicators(cell);
                    indicatorsElem.insertAdjacentHTML('beforeend', '<i class="md-icon timerIndicator indicatorIcon">&#xE061;</i>');
                }
                cell.setAttribute('data-timerid', newTimerId);
            }
        }

        function onTimerCancelled(id, itemsContainer) {

            var cells = itemsContainer.querySelectorAll('.card[data-timerid="' + id + '"]');

            for (var i = 0, length = cells.length; i < length; i++) {
                var cell = cells[i];
                var icon = cell.querySelector('.timerIndicator');
                if (icon) {
                    icon.parentNode.removeChild(icon);
                }
                cell.removeAttribute('data-timerid');
            }
        }

        function onSeriesTimerCancelled(id, itemsContainer) {

            var cells = itemsContainer.querySelectorAll('.card[data-seriestimerid="' + id + '"]');

            for (var i = 0, length = cells.length; i < length; i++) {
                var cell = cells[i];
                var icon = cell.querySelector('.timerIndicator');
                if (icon) {
                    icon.parentNode.removeChild(icon);
                }
                cell.removeAttribute('data-seriestimerid');
            }
        }

        return {
            setCardData: setCardData,
            getCardsHtml: getCardsHtml,
            getCardHtml: getCardHtml,
            getCardParts: getCardParts,
            buildCards: buildCards,
            onUserDataChanged: onUserDataChanged,
            onTimerCreated: onTimerCreated,
            onTimerCancelled: onTimerCancelled,
            onSeriesTimerCancelled: onSeriesTimerCancelled,
            getDefaultIcon: getDefaultIcon
        };
    });