/* ==========
  Version 1.0.1
  Sidebar Nav for Squarespace
  Copyright Will Myers 
========== */
(async function () { 
  let pS = {
    id: 'sidebar',
    count: 1,
    cssUrl: 'https://assets.codepen.io/3198845/WMFullScreenNavv0.0.1.css',
  };
  let utils = {
    /* Emit a custom event */
    emitEvent: function (type, detail = {}, elem = document) {
      // Make sure there's an event type
      if (!type) return;

      // Create a new event
      let event = new CustomEvent(type, {
        bubbles: true,
        cancelable: true,
        detail: detail,
      });

      // Dispatch the event
      return elem.dispatchEvent(event);
    },
    inIframe: function () {
      try {
        return window.self !== window.top;
      } catch (e) {
        return true;
      }
    },
    preventPlugin: function () {
      let styles = window.getComputedStyle(document.body),
          prevent = (styles.getPropertyValue(`--${ps.id}-edit-mode`) === 'true');

      return (prevent && utils.inIframe());
    },
    debounce: function (fn) {
      // Setup a timer
      let timeout;

      // Return a function to run debounced
      return function () {
        // Setup the arguments
        let context = this;
        let args = arguments;

        // If there's a timer, cancel it
        if (timeout) {
          window.cancelAnimationFrame(timeout);
        }

        // Setup the new requestAnimationFrame()
        timeout = window.requestAnimationFrame(function () {
          fn.apply(context, args);
        });
      }
    },
    getPropertyValue: function (el, prop) {
      return window.getComputedStyle(el).getPropertyValue(prop);
    },
    unescapeSlashes: function (str) {
      let parsedStr = str.replace(/(^|[^\\])(\\\\)*\\$/, "$&\\");
      parsedStr = parsedStr.replace(/(^|[^\\])((\\\\)*")/g, "$1\\$2");

      try {
        parsedStr = JSON.parse(`"${parsedStr}"`);
      } catch (e) {
        return str;
      }
      return parsedStr;
    },
    ssVerion: function () {
      if (Static.SQUARESPACE_CONTEXT.templateVersion)
        return Static.SQUARESPACE_CONTEXT.templateVersion;
    },
    headerValues: function () {
      let values = {
        header: null,
        bottom: 0,
        height: 100
      },
          header = document.querySelector('#header') || document.querySelector('header.Header') || null;
      if (header == null) return values;

      let rect = header.getBoundingClientRect();
      values = {
        header: header,
        height: rect.height,
        bottom: rect.bottom
      }
      return values;
    },
    deepMerge: function () {

      // Setup merged object
      var newObj = {};

      // Merge the object into the newObj object
      var merge = function (obj) {
        for (var prop in obj) {
          if (obj.hasOwnProperty(prop)) {
            // If property is an object, merge properties
            if (Object.prototype.toString.call(obj[prop]) === '[object Object]') {
              newObj[prop] = deepMerge(newObj[prop], obj[prop]);
            } else {
              newObj[prop] = obj[prop];
            }
          }
        }
      };

      // Loop through each object and conduct a merge
      for (var i = 0; i < arguments.length; i++) {
        merge(arguments[i]);
      }

      return newObj;

    },
    getSSPageData: async function (url) {
      try {
        let response = await fetch(`${url}?format=json`);

        // If the call failed, throw an error
        if (!response.ok) {
          throw 'Something went wrong.';
        }

        let data = await response.json();

        return data;

      } catch (error) {
        console.log('error')
        console.warn(error);
      }
    },
    getSSPageContent: async function (url, target = 'main', isElement = false) {
      try {
        let response = await fetch(`${url}`);

        // If the call failed, throw an error
        if (!response.ok) {
          throw 'Something went wrong.';
        }

        let text = await response.text();
        let frag = document.createRange().createContextualFragment(text),
            part = frag.querySelector(target);

        return part

      } catch (error) {
        console.log('error')
        console.warn(error);
      }
    }
  };
  let contentWrapper = document.querySelector('.blog-item-content-wrapper');
  let innerWrapper = document.querySelector('.blog-item-inner-wrapper');
  
  if (!contentWrapper) return;

  let settings = getSettings();
  let data = await utils.getSSPageData(window.location.href),
      item = data.item;
  let blogTagsAndCats = getTagsAndCats();
  let activeSidebar = determineActiveSidebar();
  
  if (!activeSidebar) return
  
  let sidebar = await utils.getSSPageContent(activeSidebar, '#sections > *:first-child .content-wrapper');
  let aside = `<aside class="wm-blog-sidebar"></aside>`;
  let header = document.querySelector('#header')
  
  /*Events*/
  innerWrapper.classList.add('has-wm-blog-sidebar');
  contentWrapper.insertAdjacentHTML('afterend', aside);
  aside = innerWrapper.querySelector('.wm-blog-sidebar');
  aside.append(sidebar);
  Squarespace.globalInit(Y);
  setContentFitImages();
  loadImages()
  header.addEventListener('transitionend', setHeaderBottom);
  setHeaderBottom();

  //Methods
  function getSettings() {
    let s = {
      tags: [], 
      categories: [], 
      collections: []
    },
        globalSettings = window.wmBlogSidebarSettings ? window.wmBlogSidebarSettings : {},
        tagsArray = [{
          tag: "wmBlogSidebar",
          sidebarUrl: "/wm-blog-sidebar"
        }],
        catsArray = [],
        collectionsArray = [];

    s.tags = globalSettings.tags ? globalSettings.tags.concat(tagsArray) : tagsArray;
    s.categories = globalSettings.categories ? globalSettings.categories.concat(catsArray) : catsArray;
    s.collections = globalSettings.collections ? globalSettings.collections.concat(collectionsArray) : collectionsArray;
    
    return s;
  }
  function getTagsAndCats() {
    let newArray = [];
    if(item.tags){ newArray = [...newArray, ...item.tags] }
    if(item.categories){ newArray = [...newArray, ...item.categories] }

    return newArray
  }
  function determineActiveSidebar() {
    let sidebarUrl = '';
    function hasIndex(arr, str) {
      let index = arr.findIndex(element => {
        return element.toLowerCase() === str.toLowerCase();
      });
      return index
    }

    //Collection Wide Sidebar
    for (let item of settings.collections) {
      if (item.collectionUrl == data.collection.fullUrl){
        sidebarUrl = item.sidebarUrl
      }
    }

    // Tag Specific Sidebar
    for (let tagItem of settings.tags) {
      let tag = tagItem.tag;
      let index = hasIndex(blogTagsAndCats, tag);
      if (index >= 0) {
        sidebarUrl = tagItem.sidebarUrl
      }
    }

    //Category Specific Sidebar
    for (let catItem of settings.categories) {
      let cat = catItem.category;
      let index = hasIndex(blogTagsAndCats, cat);
      if (index >= 0) {
        sidebarUrl = catItem.sidebarUrl
      }
    }


    return sidebarUrl
  }
  function setContentFitImages() {
    let images = aside.querySelectorAll('.sqs-image .content-fit img');

    for (let img of images) {
      let dimensions = img.dataset.imageDimensions.split('x'),
          aspectRatio = dimensions[0] / dimensions[1];
      img.closest('.sqs-image').style.aspectRatio = aspectRatio;
    }


  }
  function loadImages() {
    var images = aside.querySelectorAll('img[data-src]');
    for (var i = 0; i < images.length; i++) {
      ImageLoader.load(images[i], {load: true});
    }
  }
  function setHeaderBottom() {
    let bottom = utils.headerValues().bottom <= 0 ? 0 : utils.headerValues().bottom;
    aside.style.setProperty('--header-bottom', `${bottom}px`)
  }
}());     