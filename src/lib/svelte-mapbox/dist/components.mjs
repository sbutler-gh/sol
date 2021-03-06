function noop() { }
function assign(tar, src) {
    // @ts-ignore
    for (const k in src)
        tar[k] = src[k];
    return tar;
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function is_empty(obj) {
    return Object.keys(obj).length === 0;
}
function create_slot(definition, ctx, $$scope, fn) {
    if (definition) {
        const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
        return definition[0](slot_ctx);
    }
}
function get_slot_context(definition, ctx, $$scope, fn) {
    return definition[1] && fn
        ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
        : $$scope.ctx;
}
function get_slot_changes(definition, $$scope, dirty, fn) {
    if (definition[2] && fn) {
        const lets = definition[2](fn(dirty));
        if ($$scope.dirty === undefined) {
            return lets;
        }
        if (typeof lets === 'object') {
            const merged = [];
            const len = Math.max($$scope.dirty.length, lets.length);
            for (let i = 0; i < len; i += 1) {
                merged[i] = $$scope.dirty[i] | lets[i];
            }
            return merged;
        }
        return $$scope.dirty | lets;
    }
    return $$scope.dirty;
}
function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
    const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
    if (slot_changes) {
        const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
        slot.p(slot_context, slot_changes);
    }
}

function append(target, node) {
    target.appendChild(node);
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function element(name) {
    return document.createElement(name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function children(element) {
    return Array.from(element.childNodes);
}
function custom_event(type, detail) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, false, false, detail);
    return e;
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error('Function called outside component initialization');
    return current_component;
}
function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
}
function onDestroy(fn) {
    get_current_component().$$.on_destroy.push(fn);
}
function createEventDispatcher() {
    const component = get_current_component();
    return (type, detail) => {
        const callbacks = component.$$.callbacks[type];
        if (callbacks) {
            // TODO are there situations where events could be dispatched
            // in a server (non-DOM) environment?
            const event = custom_event(type, detail);
            callbacks.slice().forEach(fn => {
                fn.call(component, event);
            });
        }
    };
}
function setContext(key, context) {
    get_current_component().$$.context.set(key, context);
}
function getContext(key) {
    return get_current_component().$$.context.get(key);
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
let flushing = false;
const seen_callbacks = new Set();
function flush() {
    if (flushing)
        return;
    flushing = true;
    do {
        // first, call beforeUpdate functions
        // and update components
        for (let i = 0; i < dirty_components.length; i += 1) {
            const component = dirty_components[i];
            set_current_component(component);
            update(component.$$);
        }
        set_current_component(null);
        dirty_components.length = 0;
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    flushing = false;
    seen_callbacks.clear();
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}
const outroing = new Set();
let outros;
function group_outros() {
    outros = {
        r: 0,
        c: [],
        p: outros // parent group
    };
}
function check_outros() {
    if (!outros.r) {
        run_all(outros.c);
    }
    outros = outros.p;
}
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function transition_out(block, local, detach, callback) {
    if (block && block.o) {
        if (outroing.has(block))
            return;
        outroing.add(block);
        outros.c.push(() => {
            outroing.delete(block);
            if (callback) {
                if (detach)
                    block.d(1);
                callback();
            }
        });
        block.o(local);
    }
}
function mount_component(component, target, anchor) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    // onMount happens before the initial afterUpdate
    add_render_callback(() => {
        const new_on_destroy = on_mount.map(run).filter(is_function);
        if (on_destroy) {
            on_destroy.push(...new_on_destroy);
        }
        else {
            // Edge case - component was destroyed immediately,
            // most likely as a result of a binding initialising
            run_all(new_on_destroy);
        }
        component.$$.on_mount = [];
    });
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const prop_values = options.props || {};
    const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        before_update: [],
        after_update: [],
        context: new Map(parent_component ? parent_component.$$.context : []),
        // everything else
        callbacks: blank_object(),
        dirty,
        skip_bound: false
    };
    let ready = false;
    $$.ctx = instance
        ? instance(component, prop_values, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if (!$$.skip_bound && $$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            const nodes = children(options.target);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(nodes);
            nodes.forEach(detach);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor);
        flush();
    }
    set_current_component(parent_component);
}
/**
 * Base class for Svelte components. Used when dev=false.
 */
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set($$props) {
        if (this.$$set && !is_empty($$props)) {
            this.$$.skip_bound = true;
            this.$$set($$props);
            this.$$.skip_bound = false;
        }
    }
}

function loader (urls, test, callback) {
  let remaining = urls.length;

  function maybeCallback () {
    remaining = --remaining;
    if (remaining < 1) {
      callback();
    }
  }

  if (!test()) {
    urls.forEach(({ type, url, options = { async: true, defer: true }}) => {
      const isScript = type === 'script';
      const tag = document.createElement(isScript ? 'script': 'link');
      if (isScript) {
        tag.src = url;
        tag.async = options.async;
        tag.defer = options.defer;
      } else {
        tag.rel = 'stylesheet';
		    tag.href = url;
      }
      tag.onload = maybeCallback;
      document.body.appendChild(tag);
    });
  } else {
    callback();
  }
}

const contextKey = {};

function reusify (Constructor) {
  var head = new Constructor();
  var tail = head;

  function get () {
    var current = head;

    if (current.next) {
      head = current.next;
    } else {
      head = new Constructor();
      tail = head;
    }

    current.next = null;

    return current
  }

  function release (obj) {
    tail.next = obj;
    tail = obj;
  }

  return {
    get: get,
    release: release
  }
}

var reusify_1 = reusify;

function fastqueue (context, worker, concurrency) {
  if (typeof context === 'function') {
    concurrency = worker;
    worker = context;
    context = null;
  }

  var cache = reusify_1(Task);
  var queueHead = null;
  var queueTail = null;
  var _running = 0;
  var errorHandler = null;

  var self = {
    push: push,
    drain: noop$1,
    saturated: noop$1,
    pause: pause,
    paused: false,
    concurrency: concurrency,
    running: running,
    resume: resume,
    idle: idle,
    length: length,
    getQueue: getQueue,
    unshift: unshift,
    empty: noop$1,
    kill: kill,
    killAndDrain: killAndDrain,
    error: error
  };

  return self

  function running () {
    return _running
  }

  function pause () {
    self.paused = true;
  }

  function length () {
    var current = queueHead;
    var counter = 0;

    while (current) {
      current = current.next;
      counter++;
    }

    return counter
  }

  function getQueue () {
    var current = queueHead;
    var tasks = [];

    while (current) {
      tasks.push(current.value);
      current = current.next;
    }

    return tasks
  }

  function resume () {
    if (!self.paused) return
    self.paused = false;
    for (var i = 0; i < self.concurrency; i++) {
      _running++;
      release();
    }
  }

  function idle () {
    return _running === 0 && self.length() === 0
  }

  function push (value, done) {
    var current = cache.get();

    current.context = context;
    current.release = release;
    current.value = value;
    current.callback = done || noop$1;
    current.errorHandler = errorHandler;

    if (_running === self.concurrency || self.paused) {
      if (queueTail) {
        queueTail.next = current;
        queueTail = current;
      } else {
        queueHead = current;
        queueTail = current;
        self.saturated();
      }
    } else {
      _running++;
      worker.call(context, current.value, current.worked);
    }
  }

  function unshift (value, done) {
    var current = cache.get();

    current.context = context;
    current.release = release;
    current.value = value;
    current.callback = done || noop$1;

    if (_running === self.concurrency || self.paused) {
      if (queueHead) {
        current.next = queueHead;
        queueHead = current;
      } else {
        queueHead = current;
        queueTail = current;
        self.saturated();
      }
    } else {
      _running++;
      worker.call(context, current.value, current.worked);
    }
  }

  function release (holder) {
    if (holder) {
      cache.release(holder);
    }
    var next = queueHead;
    if (next) {
      if (!self.paused) {
        if (queueTail === queueHead) {
          queueTail = null;
        }
        queueHead = next.next;
        next.next = null;
        worker.call(context, next.value, next.worked);
        if (queueTail === null) {
          self.empty();
        }
      } else {
        _running--;
      }
    } else if (--_running === 0) {
      self.drain();
    }
  }

  function kill () {
    queueHead = null;
    queueTail = null;
    self.drain = noop$1;
  }

  function killAndDrain () {
    queueHead = null;
    queueTail = null;
    self.drain();
    self.drain = noop$1;
  }

  function error (handler) {
    errorHandler = handler;
  }
}

function noop$1 () {}

function Task () {
  this.value = null;
  this.callback = noop$1;
  this.next = null;
  this.release = noop$1;
  this.context = null;
  this.errorHandler = null;

  var self = this;

  this.worked = function worked (err, result) {
    var callback = self.callback;
    var errorHandler = self.errorHandler;
    var val = self.value;
    self.value = null;
    self.callback = noop$1;
    if (self.errorHandler) {
      errorHandler(err, val);
    }
    callback.call(self.context, err, result);
    self.release(self);
  };
}

var queue = fastqueue;

class EventQueue {
  constructor (worker) {
    this.queue = new queue(this, worker, 1);
    this.queue.pause();
  }

  send (command, params = []) {
    if (!command) { return }
    this.queue.push([ command, params ]);
  }

  start () {
    this.queue.resume();
  }

  stop () {
    this.queue.kill();
  }
}

/* src/Map.svelte generated by Svelte v3.31.0 */

function add_css() {
	var style = element("style");
	style.id = "svelte-1kuj9kb-style";
	style.textContent = "div.svelte-1kuj9kb{width:100%;height:100%}";
	append(document.head, style);
}

// (2:2) {#if map}
function create_if_block(ctx) {
	let current;
	const default_slot_template = /*#slots*/ ctx[20].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[19], null);

	return {
		c() {
			if (default_slot) default_slot.c();
		},
		m(target, anchor) {
			if (default_slot) {
				default_slot.m(target, anchor);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 524288) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[19], dirty, null, null);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function create_fragment(ctx) {
	let div;
	let current;
	let if_block = /*map*/ ctx[0] && create_if_block(ctx);

	return {
		c() {
			div = element("div");
			if (if_block) if_block.c();
			attr(div, "class", "svelte-1kuj9kb");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			if (if_block) if_block.m(div, null);
			/*div_binding*/ ctx[21](div);
			current = true;
		},
		p(ctx, [dirty]) {
			if (/*map*/ ctx[0]) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*map*/ 1) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(div, null);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (if_block) if_block.d();
			/*div_binding*/ ctx[21](null);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;

	setContext(contextKey, {
		getMap: () => map,
		getMapbox: () => mapbox
	});

	const dispatch = createEventDispatcher();
	let container;
	let mapbox;
	let animationInProgress = false;
	const queue = new EventQueue(worker);
	let { map = null } = $$props;
	let { version = "v1.11.1" } = $$props;
	let { center = [0, 0] } = $$props;
	let { zoom = 9 } = $$props;
	let { zoomRate = 1 } = $$props;
	let { wheelZoomRate = 1 } = $$props;
	let { options = {} } = $$props;
	let { accessToken } = $$props;
	let { customStylesheetUrl = false } = $$props;
	let { style = "mapbox://styles/mapbox/streets-v11" } = $$props;

	function fitBounds(bbox, options = {}) {
		queue.send("fitBounds", [bbox, options]);
	}

	function flyTo(destination, options = {}) {
		queue.send("flyTo", [destination, options]);
	}

	function resize() {
		queue.send("resize");
	}

	function setCenter(coords, eventData = {}) {
		queue.send("setCenter", [coords, eventData]);
	}

	function addControl(control, position = "top-right") {
		queue.send("addControl", [control, position]);
	}

	function getMap() {
		return map;
	}

	function getMapbox() {
		return mapbox;
	}

	function setZoom(zoom, eventData = {}) {
		queue.send("setZoom", [zoom, eventData]);
	}

	function onAvailable() {
		window.mapboxgl.accessToken = accessToken;
		mapbox = window.mapboxgl;

		const optionsWithDefaults = Object.assign(
			{
				container,
				style,
				center,
				zoom,
				zoomRate,
				wheelZoomRate
			},
			options
		);

		const el = new mapbox.Map(optionsWithDefaults);

		el.on("dragend", () => {
			const { lng, lat } = el.getCenter();
			$$invalidate(3, center = [lng, lat]);
			dispatch("recentre", { center });
		});

		el.on("click", e => dispatch("click", { lng: e.lngLat.lng, lat: e.lngLat.lat }));

		el.on("zoomstart", () => {
			$$invalidate(18, animationInProgress = true);
			$$invalidate(2, zoom = el.getZoom());
			dispatch("zoomstart", { zoom });
		});

		el.on("zoom", () => {
			$$invalidate(2, zoom = el.getZoom());
			dispatch("zoom", { zoom });
		});

		el.on("zoomend", () => {
			$$invalidate(18, animationInProgress = false);
			$$invalidate(2, zoom = el.getZoom());
			dispatch("zoomend", { zoom });
		});

		el.on("load", () => {
			$$invalidate(0, map = el);
			queue.start();
			dispatch("ready");
		});
	}

	function worker(cmd, cb) {
		const [command, params] = cmd;
		map[command].apply(map, params);
		cb(null);
	}

	onMount(() => {
		const resources = [
			{
				type: "script",
				url: `//api.mapbox.com/mapbox-gl-js/${version}/mapbox-gl.js`
			},
			{
				type: "style",
				url: `//api.mapbox.com/mapbox-gl-js/${version}/mapbox-gl.css`
			}
		];

		if (customStylesheetUrl) {
			resources.push({ type: "style", url: customStylesheetUrl });
		}

		loader(resources, () => !!window.mapboxgl, onAvailable);

		return () => {
			queue.stop();

			if (map && map.remove) {
				map.remove();
			}
		};
	});

	function div_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			container = $$value;
			$$invalidate(1, container);
		});
	}

	$$self.$$set = $$props => {
		if ("map" in $$props) $$invalidate(0, map = $$props.map);
		if ("version" in $$props) $$invalidate(4, version = $$props.version);
		if ("center" in $$props) $$invalidate(3, center = $$props.center);
		if ("zoom" in $$props) $$invalidate(2, zoom = $$props.zoom);
		if ("zoomRate" in $$props) $$invalidate(5, zoomRate = $$props.zoomRate);
		if ("wheelZoomRate" in $$props) $$invalidate(6, wheelZoomRate = $$props.wheelZoomRate);
		if ("options" in $$props) $$invalidate(7, options = $$props.options);
		if ("accessToken" in $$props) $$invalidate(8, accessToken = $$props.accessToken);
		if ("customStylesheetUrl" in $$props) $$invalidate(9, customStylesheetUrl = $$props.customStylesheetUrl);
		if ("style" in $$props) $$invalidate(10, style = $$props.style);
		if ("$$scope" in $$props) $$invalidate(19, $$scope = $$props.$$scope);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*animationInProgress, zoom*/ 262148) {
			 !animationInProgress && setZoom(zoom);
		}
	};

	return [
		map,
		container,
		zoom,
		center,
		version,
		zoomRate,
		wheelZoomRate,
		options,
		accessToken,
		customStylesheetUrl,
		style,
		fitBounds,
		flyTo,
		resize,
		setCenter,
		addControl,
		getMap,
		getMapbox,
		animationInProgress,
		$$scope,
		slots,
		div_binding
	];
}

class Map$1 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-1kuj9kb-style")) add_css();

		init(this, options, instance, create_fragment, safe_not_equal, {
			map: 0,
			version: 4,
			center: 3,
			zoom: 2,
			zoomRate: 5,
			wheelZoomRate: 6,
			options: 7,
			accessToken: 8,
			customStylesheetUrl: 9,
			style: 10,
			fitBounds: 11,
			flyTo: 12,
			resize: 13,
			setCenter: 14,
			addControl: 15,
			getMap: 16,
			getMapbox: 17
		});
	}

	get fitBounds() {
		return this.$$.ctx[11];
	}

	get flyTo() {
		return this.$$.ctx[12];
	}

	get resize() {
		return this.$$.ctx[13];
	}

	get setCenter() {
		return this.$$.ctx[14];
	}

	get addControl() {
		return this.$$.ctx[15];
	}

	get getMap() {
		return this.$$.ctx[16];
	}

	get getMapbox() {
		return this.$$.ctx[17];
	}
}

/* src/Marker.svelte generated by Svelte v3.31.0 */
const get_popup_slot_changes = dirty => ({});
const get_popup_slot_context = ctx => ({});

function create_fragment$1(ctx) {
	let div0;
	let t;
	let div1;
	let current;
	const default_slot_template = /*#slots*/ ctx[13].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[12], null);
	const popup_slot_template = /*#slots*/ ctx[13].popup;
	const popup_slot = create_slot(popup_slot_template, ctx, /*$$scope*/ ctx[12], get_popup_slot_context);

	return {
		c() {
			div0 = element("div");
			if (default_slot) default_slot.c();
			t = space();
			div1 = element("div");
			if (popup_slot) popup_slot.c();
			attr(div1, "class", "popup");
		},
		m(target, anchor) {
			insert(target, div0, anchor);

			if (default_slot) {
				default_slot.m(div0, null);
			}

			/*div0_binding*/ ctx[14](div0);
			insert(target, t, anchor);
			insert(target, div1, anchor);

			if (popup_slot) {
				popup_slot.m(div1, null);
			}

			/*div1_binding*/ ctx[15](div1);
			current = true;
		},
		p(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 4096) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[12], dirty, null, null);
				}
			}

			if (popup_slot) {
				if (popup_slot.p && dirty & /*$$scope*/ 4096) {
					update_slot(popup_slot, popup_slot_template, ctx, /*$$scope*/ ctx[12], dirty, get_popup_slot_changes, get_popup_slot_context);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			transition_in(popup_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			transition_out(popup_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div0);
			if (default_slot) default_slot.d(detaching);
			/*div0_binding*/ ctx[14](null);
			if (detaching) detach(t);
			if (detaching) detach(div1);
			if (popup_slot) popup_slot.d(detaching);
			/*div1_binding*/ ctx[15](null);
		}
	};
}

function randomColour() {
	return Math.round(Math.random() * 255);
}

function instance$1($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	const { getMap, getMapbox } = getContext(contextKey);
	const map = getMap();
	const mapbox = getMapbox();

	function move(lng, lat) {
		marker.setLngLat({ lng, lat });
	}

	let { lat } = $$props;
	let { lng } = $$props;
	let { label = "Marker" } = $$props;
	let { popupClassName = "beyonk-mapbox-popup" } = $$props;
	let { markerOffset = [0, 0] } = $$props;
	let { popupOffset = 10 } = $$props;
	let { color = randomColour() } = $$props;
	let { popup = true } = $$props;
	let marker;
	let element;
	let elementPopup;

	onMount(() => {
		if (element.hasChildNodes()) {
			$$invalidate(11, marker = new mapbox.Marker({ element, offset: markerOffset }));
		} else {
			$$invalidate(11, marker = new mapbox.Marker({ color, offset: markerOffset }));
		}

		if (popup) {
			const popupEl = new mapbox.Popup({
					offset: popupOffset,
					className: popupClassName
				});

			if (elementPopup.hasChildNodes()) {
				popupEl.setDOMContent(elementPopup);
			} else {
				popupEl.setText(label);
			}

			marker.setPopup(popupEl);
		}

		marker.setLngLat({ lng, lat }).addTo(map);
		return () => marker.remove();
	});

	function getMarker() {
		return marker;
	}

	function div0_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			element = $$value;
			$$invalidate(0, element);
		});
	}

	function div1_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			elementPopup = $$value;
			$$invalidate(1, elementPopup);
		});
	}

	$$self.$$set = $$props => {
		if ("lat" in $$props) $$invalidate(2, lat = $$props.lat);
		if ("lng" in $$props) $$invalidate(3, lng = $$props.lng);
		if ("label" in $$props) $$invalidate(4, label = $$props.label);
		if ("popupClassName" in $$props) $$invalidate(5, popupClassName = $$props.popupClassName);
		if ("markerOffset" in $$props) $$invalidate(6, markerOffset = $$props.markerOffset);
		if ("popupOffset" in $$props) $$invalidate(7, popupOffset = $$props.popupOffset);
		if ("color" in $$props) $$invalidate(8, color = $$props.color);
		if ("popup" in $$props) $$invalidate(9, popup = $$props.popup);
		if ("$$scope" in $$props) $$invalidate(12, $$scope = $$props.$$scope);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*marker, lng, lat*/ 2060) {
			 marker && move(lng, lat);
		}
	};

	return [
		element,
		elementPopup,
		lat,
		lng,
		label,
		popupClassName,
		markerOffset,
		popupOffset,
		color,
		popup,
		getMarker,
		marker,
		$$scope,
		slots,
		div0_binding,
		div1_binding
	];
}

class Marker extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
			lat: 2,
			lng: 3,
			label: 4,
			popupClassName: 5,
			markerOffset: 6,
			popupOffset: 7,
			color: 8,
			popup: 9,
			getMarker: 10
		});
	}

	get getMarker() {
		return this.$$.ctx[10];
	}
}

/* src/Geocoder.svelte generated by Svelte v3.31.0 */

function add_css$1() {
	var style = element("style");
	style.id = "svelte-1k1b3t4-style";
	style.textContent = "div.svelte-1k1b3t4{padding:0}";
	append(document.head, style);
}

function create_fragment$2(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			attr(div, "id", /*fieldId*/ ctx[1]);
			attr(div, "class", "svelte-1k1b3t4");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			/*div_binding*/ ctx[11](div);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
			/*div_binding*/ ctx[11](null);
		}
	};
}

function instance$2($$self, $$props, $$invalidate) {
	const dispatch = createEventDispatcher();
	const fieldId = "bsm-" + Math.random().toString(36).substring(6);
	let { accessToken } = $$props;
	let { options = {} } = $$props;
	let { version = "v4.5.1" } = $$props;

	let { types = [
		"country",
		"region",
		"postcode",
		"district",
		"place",
		"locality",
		"neighborhood",
		"address"
	] } = $$props;

	let { placeholder = "Search" } = $$props;
	let { value = null } = $$props;
	let { customStylesheetUrl = false } = $$props;
	let { geocoder = null } = $$props;
	let container;
	let ready = false;
	const onResult = p => dispatch("result", p);
	const onResults = p => dispatch("results", p);
	const onError = p => dispatch("error", p);
	const onLoading = p => dispatch("loading", p);
	const onClear = p => dispatch("clear", p);

	onMount(() => {
		const resources = [
			{
				type: "script",
				url: `//api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/${version}/mapbox-gl-geocoder.min.js`
			},
			{
				type: "style",
				url: `//api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/${version}/mapbox-gl-geocoder.css`
			}
		];

		if (customStylesheetUrl) {
			resources.push({ type: "style", url: customStylesheetUrl });
		}

		loader(resources, () => !!window.MapboxGeocoder, onAvailable);

		return () => {
			geocoder && geocoder.off("results", onResults).off("result", onResult).off("loading", onLoading).off("error", onError).off("clear", onClear);
		};
	});

	function onAvailable() {
		const optionsWithDefaults = Object.assign(
			{
				accessToken,
				types: types.join(","),
				placeholder
			},
			options
		);

		$$invalidate(2, geocoder = new window.MapboxGeocoder(optionsWithDefaults));
		geocoder.addTo(`#${fieldId}`);
		geocoder.on("results", onResults).on("result", onResult).on("loading", onLoading).on("error", onError).on("clear", onClear);
		geocoder.setInput(value);
		$$invalidate(10, ready = true);
		dispatch("ready");
	}

	function div_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			container = $$value;
			$$invalidate(0, container);
		});
	}

	$$self.$$set = $$props => {
		if ("accessToken" in $$props) $$invalidate(3, accessToken = $$props.accessToken);
		if ("options" in $$props) $$invalidate(4, options = $$props.options);
		if ("version" in $$props) $$invalidate(5, version = $$props.version);
		if ("types" in $$props) $$invalidate(6, types = $$props.types);
		if ("placeholder" in $$props) $$invalidate(7, placeholder = $$props.placeholder);
		if ("value" in $$props) $$invalidate(8, value = $$props.value);
		if ("customStylesheetUrl" in $$props) $$invalidate(9, customStylesheetUrl = $$props.customStylesheetUrl);
		if ("geocoder" in $$props) $$invalidate(2, geocoder = $$props.geocoder);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*ready, value, geocoder*/ 1284) {
			 ready && value && geocoder && geocoder.setInput(value);
		}
	};

	return [
		container,
		fieldId,
		geocoder,
		accessToken,
		options,
		version,
		types,
		placeholder,
		value,
		customStylesheetUrl,
		ready,
		div_binding
	];
}

class Geocoder extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-1k1b3t4-style")) add_css$1();

		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
			accessToken: 3,
			options: 4,
			version: 5,
			types: 6,
			placeholder: 7,
			value: 8,
			customStylesheetUrl: 9,
			geocoder: 2
		});
	}
}

function createDispatchers (target, dispatch, events) {
  const dispatchers = events.map(name => {
    const dispatcher = data => dispatch(name, data);
    target.on(name, dispatcher);
    return { name, dispatcher }
  });

  return () => {
    dispatchers.forEach(({ name, dispatcher }) => target.off(name, dispatcher));
  }
}

/* src/controls/GeolocateControl.svelte generated by Svelte v3.31.0 */

function instance$3($$self, $$props, $$invalidate) {
	const dispatch = createEventDispatcher();
	const { getMap, getMapbox } = getContext(contextKey);
	const map = getMap();
	const mapbox = getMapbox();
	let { position = "top-left" } = $$props;
	let { options = {} } = $$props;

	const events = [
		"error",
		"geolocate",
		"outofmaxbounds",
		"trackuserlocationend",
		"trackuserlocationstart"
	];

	const geolocate = new mapbox.GeolocateControl(options);
	map.addControl(geolocate, position);
	const destroyDispatchers = createDispatchers(geolocate, dispatch, events);
	onDestroy(destroyDispatchers);

	function trigger() {
		geolocate.trigger();
	}

	$$self.$$set = $$props => {
		if ("position" in $$props) $$invalidate(0, position = $$props.position);
		if ("options" in $$props) $$invalidate(1, options = $$props.options);
	};

	return [position, options, trigger];
}

class GeolocateControl extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$3, null, safe_not_equal, { position: 0, options: 1, trigger: 2 });
	}

	get trigger() {
		return this.$$.ctx[2];
	}
}

/* src/controls/NavigationControl.svelte generated by Svelte v3.31.0 */

function instance$4($$self, $$props, $$invalidate) {
	const { getMap, getMapbox } = getContext(contextKey);
	const map = getMap();
	const mapbox = getMapbox();
	let { position = "top-right" } = $$props;
	let { options = {} } = $$props;
	const nav = new mapbox.NavigationControl(options);
	map.addControl(nav, position);

	$$self.$$set = $$props => {
		if ("position" in $$props) $$invalidate(0, position = $$props.position);
		if ("options" in $$props) $$invalidate(1, options = $$props.options);
	};

	return [position, options];
}

class NavigationControl extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$4, null, safe_not_equal, { position: 0, options: 1 });
	}
}

/* src/controls/ScaleControl.svelte generated by Svelte v3.31.0 */

function instance$5($$self, $$props, $$invalidate) {
	const { getMap, getMapbox } = getContext(contextKey);
	const map = getMap();
	const mapbox = getMapbox();
	let { position = "bottom-right" } = $$props;
	let { options = {} } = $$props;
	const optionsWithDefaults = Object.assign({ maxWidth: 80, unit: "metric" }, options);
	const scale = new mapbox.ScaleControl(optionsWithDefaults);
	map.addControl(scale, position);

	$$self.$$set = $$props => {
		if ("position" in $$props) $$invalidate(0, position = $$props.position);
		if ("options" in $$props) $$invalidate(1, options = $$props.options);
	};

	return [position, options];
}

class ScaleControl extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$5, null, safe_not_equal, { position: 0, options: 1 });
	}
}

const controls = {
  GeolocateControl,
  NavigationControl,
  ScaleControl,
  ScalingControl: ScaleControl
};

export { Geocoder, Map$1 as Map, Marker, contextKey, controls };
