/**
 * Created by Xcar on 2016/8/16.
 */
/**
 * @author 建统
 */

    /**
     * @class Class for calculating pagination values
     */
    $.PaginationCalculator = function(maxentries, opts) {
        this.maxentries = maxentries;
        this.opts = opts;
    }

    $.extend($.PaginationCalculator.prototype, {
        /**
         * Calculate the maximum number of pages
         * @method
         * @returns {Number}
         */
        numPages : function() {
            return Math.ceil(this.maxentries / this.opts.items_per_page);
        },
        /**
         * Calculate start and end point of pagination links depending on
         * current_page and num_display_entries.
         * @returns {Array}
         */
        getInterval : function(current_page) {
            var ne_half = Math.floor(this.opts.num_display_entries / 2);
            var np = this.numPages();
            var upper_limit = np - this.opts.num_display_entries;
            var start = current_page > ne_half ? Math.max(Math.min(current_page - ne_half, upper_limit), 0) : 0;
            var end = current_page > ne_half ? Math.min(current_page + ne_half + (this.opts.num_display_entries % 2), np) : Math.min(this.opts.num_display_entries, np);
            return {
                start : start,
                end : end
            };
        }
    });

    // Initialize jQuery object container for pagination renderers
    $.PaginationRenderers = {}

    /**
     * @class Default renderer for rendering pagination links
     */
    $.PaginationRenderers.defaultRenderer = function(maxentries, opts) {
        this.maxentries = maxentries;
        this.opts = opts;
        this.pc = new $.PaginationCalculator(maxentries, opts);
    }
    $.extend($.PaginationRenderers.defaultRenderer.prototype, {
        /**
         * Helper function for generating a single link (or a span tag if it's the current page)
         * @param {Number} page_id The page id for the new item
         * @param {Number} current_page
         * @param {Object} appendopts Options for the new item: text and classes
         * @returns {jQuery} jQuery object containing the link
         */
        createLink : function(page_id, current_page, appendopts) {
            var lnk, np = this.pc.numPages();
            page_id = page_id < 0 ? 0 : (page_id < np ? page_id : np - 1);
            // Normalize page id to sane value
            appendopts = $.extend({
                text : page_id + 1,
                classes : ""
            }, appendopts || {});
            if (page_id == current_page) {
                lnk = $("<a isend='"+ (appendopts.end||false) +"' class='" + (appendopts.current_cls || "selected") + "'>" + appendopts.text + "</a>");
            } else {
                lnk = $("<a isend='"+ (appendopts.end||false) +"' >" + appendopts.text + "</a>").attr('href', this.opts.link_to.replace(/__id__/, page_id));
            }
            if (appendopts.classes) {
                lnk.addClass(appendopts.classes);
            }
            lnk.data('page_id', page_id);
            return lnk;
        },
        // Generate a range of numeric links
        appendRange : function(container, current_page, start, end, opts) {
            var i;
            for ( i = start; i < end; i++) {
                var opts= $.extend(opts,{end:i==end-1});
                this.createLink(i, current_page, opts).appendTo(container);
            }
        },
        getLinks : function(current_page, eventHandler, cls) {
            var begin, end, interval = this.pc.getInterval(current_page), np = this.pc.numPages(), fragment = $("<div class='" + (cls || "pagination") + "'></div>");

            // Generate "Previous"-Link
            if (this.opts.prev_text && (current_page > 0 || this.opts.prev_show_always)) {
                fragment.append(this.createLink(current_page - 1, current_page, {
                    text : this.opts.prev_text,
                    classes : "prev",
                    current_cls : this.opts.prev_current_cls
                }));
            }
            // Generate starting points
            if (interval.start > 0 && this.opts.num_edge_entries > 0) {
                end = Math.min(this.opts.num_edge_entries, interval.start);
                this.appendRange(fragment, current_page, 0, end, {
                    classes : 'sp'
                });
                if (this.opts.num_edge_entries < interval.start && this.opts.ellipse_text) {
                    jQuery("<span>" + this.opts.ellipse_text + "</span>").appendTo(fragment);
                }
            }
            // Generate interval links
            this.appendRange(fragment, current_page, interval.start, interval.end);
            // Generate ending points
            if (interval.end < np && this.opts.num_edge_entries > 0) {
                if (np - this.opts.num_edge_entries > interval.end && this.opts.ellipse_text) {
                    jQuery("<span>" + this.opts.ellipse_text + "</span>").appendTo(fragment);
                }
                begin = Math.max(np - this.opts.num_edge_entries, interval.end);
                this.appendRange(fragment, current_page, begin, np, {
                    classes : 'ep'
                });

            }
            // Generate "Next"-Link
            if (this.opts.next_text && (current_page < np - 1 || this.opts.next_show_always)) {
                fragment.append(this.createLink(current_page + 1, current_page, {
                    text : this.opts.next_text,
                    classes : "next",
                    current_cls : this.opts.next_current_cls
                }));
            }

            if (this.opts.jump) {
                this.opts.jump.text=this.opts.jump.text||'go';
                jQuery('<input type="text" class="jumpnum" /><a class="jumpbtn">' + this.opts.jump.text + '</a>').appendTo(fragment);
            }
            $('a', fragment).click(eventHandler);
            return fragment;
        }
    });

    // Extend jQuery
    $.fn.pagination = function(maxentries, opts) {
        // Initialize options with default values
        opts = jQuery.extend({
            items_per_page : 10,
            num_display_entries : 11,
            current_page : 1,
            num_edge_entries : 0,
            link_to : "javascript:void(0)",
            prev_text : "prev",
            next_text : "next",
            ellipse_text : "...",
            prev_show_always : true,
            next_show_always : true,
            renderer : "defaultRenderer",
            cls : "pagination",
            callback : function() {
                return false;
            }
        }, opts || {});
        --opts.current_page;
        var containers = this, renderer, links, current_page;
        var totalPage=Math.ceil(maxentries / opts.items_per_page);
        /**
         * This is the event handling function for the pagination links.
         * @param {int} page_id The new page number
         */
        function paginationClickHandler(evt) {
            var target = $(evt.target);
            var links, new_current_page = target.data('page_id');
            if (isNaN(new_current_page)) {
                new_current_page = target.prev('input').val() - 1;
            }
            if (new_current_page>=0&&new_current_page<=totalPage-1) {
                var continuePropagation = selectPage(new_current_page);
                if (!continuePropagation) {
                    evt.stopPropagation();
                }
                return continuePropagation;
            }
        }

        /**
         * This is a utility function for the internal event handlers.
         * It sets the new current page on the pagination container objects,
         * generates a new HTMl fragment for the pagination links and calls
         * the callback function.
         */
        function selectPage(new_current_page) {
            // update the link display of a all containers
            containers.data('current_page', new_current_page);
            links = renderer.getLinks(new_current_page, paginationClickHandler, opts.cls);
            containers.empty();
            links.appendTo(containers);
            // call the callback and propagate the event if it does not return false
            var continuePropagation = opts.callback(new_current_page + 1, containers);
            return continuePropagation;
        }

        // -----------------------------------
        // Initialize containers
        // -----------------------------------
        current_page = opts.current_page;
        containers.data('current_page', current_page);
        // Create a sane value for maxentries and items_per_page
        maxentries = (!maxentries || maxentries < 0) ? 1 : maxentries;
        opts.items_per_page = (!opts.items_per_page || opts.items_per_page < 0) ? 1 : opts.items_per_page;

        if (!$.PaginationRenderers[opts.renderer]) {
            throw new ReferenceError("Pagination renderer '" + opts.renderer + "' was not found in jQuery.PaginationRenderers object.");
        }
        renderer = new $.PaginationRenderers[opts.renderer](maxentries, opts);

        // Attach control events to the DOM elements
        var pc = new $.PaginationCalculator(maxentries, opts);
        var np = pc.numPages();
        containers.bind('setPage', {
            numPages : np
        }, function(evt, page_id) {
            if (page_id >= 0 && page_id < evt.data.numPages) {
                selectPage(page_id);
                return false;
            }
        });
        containers.bind('prevPage', function(evt) {
            var current_page = $(this).data('current_page');
            if (current_page > 0) {
                selectPage(current_page - 1);
            }
            return false;
        });
        containers.bind('nextPage', {
            numPages : np
        }, function(evt) {
            var current_page = $(this).data('current_page');
            if (current_page < evt.data.numPages - 1) {
                selectPage(current_page + 1);
            }
            return false;
        });

        // When all initialisation is done, draw the links
        links = renderer.getLinks(current_page, paginationClickHandler, opts.cls);
        containers.empty();
        links.appendTo(containers);
        // call callback function
        //opts.callback(current_page, containers);
    }// End of $.fn.pagination block

    //分页设置
    function pagination(opt) {
        if (!(opt && opt.totalPageCount && opt.pageSize)) {
            $(opt.ctr).empty();
            return false;
        }
        if (opt.totalPageCount > opt.pageSize) {
            jQuery(opt.ctr).pagination(opt.totalPageCount, {
    //                    callback : opt.fun,
                prev_text : '上一页', //上一页按钮里text
                next_text : '下一页', //下一页按钮里text
                items_per_page : opt.pageSize, //显示条数
                num_display_entries : opt.num_edge_entries||2, //连续分页主体部分分页条目数
                current_page : opt.current, //当前页索引
                num_edge_entries : 1, //两侧首尾分页条目数
                cls : "cutepage",
                prev_current_cls : "disabled",
                next_current_cls : "disabled",
                jump : opt.jump || false
            });
        }
    }