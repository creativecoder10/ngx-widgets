import { Component, Pipe, Input, Output, EventEmitter, ElementRef, ViewChild } from '@angular/core';
import { trigger, transition, animate, style, state, group, keyframes } from '@angular/core';

import { ACA_Animate } from '../../services/animate.service';
import { MapService } from './map.service';

declare let Hammer: any;

const ZOOM_LIMIT = 1000;
const PADDING = 50;

const zoom_anim = (function() {
	let base = 50;
	let space = 1;
	let max = ZOOM_LIMIT;
	let time = '50ms ease-in-out';
	let animation = [];
    	// Create States
	for(let i = base; i < max; i += space) {
			//Width
		let pos = i;
		animation.push(state(i.toString(),   style({'transform': 'scale(' + pos/100 + ')'})));
	}
		// Add transition
	animation.push(transition('* <=> *', animate(time) ));
	animation.push(transition('void => *', []));
	return animation;
})();


@Component({
    selector: 'interactive-map',
    templateUrl: './map.template.html',
    styles: [ require('./map.styles.scss') ],
    animations: [
        trigger('zoom', zoom_anim),
        trigger('pin', [
        	state('hide', style({opacity: 0})),
        	state('show', style({opacity: 1})),
        	transition('* => show', [ style({top: '-100px', opacity: 0}), animate('700ms ease-out', style({top: '*', opacity: 1})) ])
        ])
    ]
})
export class InteractiveMap {
    @Input() map: string;
    @Input() zoomMax: number = 200;
    @Input() zoom: number = 0;
    @Input() controls: boolean = true;
    @Input() disable: string[] = [];
    @Input() pins: any[] = [];
    @Input() mapSize: any = 100;
    @Input() focus: any;
    @Input() focusScroll: boolean = false;
    @Input() focusZoom: number = 80;
    @Input() padding: string = '2.0em';
    @Input() color: string = '#000';
    @Input() mapStyles: { id: string, color: string, fill: string, opacity: string }[] = [];
    @Output() tap = new EventEmitter();
    @Output() zoomChange = new EventEmitter();

    //*
        //Toggle Knob
    @ViewChild('displayarea')  self: ElementRef;
    @ViewChild('maparea')  map_area: ElementRef;
    @ViewChild('mapdisplay')  map_display: ElementRef;
    content_box: any;
    map_box: any;
    map_data: any;
    map_item: any;
    touchmap: any;
    private _zoom: number = 0; // As Percentage
    rotate: number = 0; // In degrees
    zoomed: boolean = false;
    debug: string[] = [];
    map_orientation: string = '';
    activate: boolean = false;
    de: any;
    active = false;
   	min = 20;
   	isFocus = false;
   	loading = true;
   	zoom_state: string = '100w';
	center: any = { x: 0.5, y: 0.5 };
	min_center: any = { x: 0.5, y: 0.5 };
	max_center: any = { x: 0.5, y: 0.5 };

   	pin_html = `
		<?xml version="1.0" encoding="utf-8"?>
		<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 53 65.7" style="enable-background:new 0 0 53 65.7;" xml:space="preserve">
			<style type="text/css">
				.aca-st0{fill:#FFFFFF;} .aca-st1{fill:#DC6900;stroke:#FFFFFF;stroke-width:2.5;stroke-miterlimit:10;}
			</style>
			<g>
				<circle class="aca-st0" cx="27.6" cy="21.8" r="13.1"/>
				<path class="aca-st1" d="M27.6,4c9.9,0,18,8.1,18,18s-17.1,38.2-18,39.6c-0.9-1.5-18-29.7-18-39.6S17.7,4,27.6,4z M27.6,32.8 c6,0,10.8-4.8,10.8-10.8s-4.8-10.8-10.8-10.8S16.8,16,16.8,22S21.6,32.8,27.6,32.8"/>
			</g>
		</svg>
   	`

   	pin_defaults = {
   		x: 0,
   		y: 0,
   		colors : {
   			one: '#DC6900',
   			two : '#FFFFFF'
   		}
   	}

   	pin_cnt: number = 0;
	box_update: any = null;
    draw: any = null;
    drawing: any = null;
	status_check: any = null;
	zoom_bb: any = null;
	move_timer: any = null;

    constructor(private a: ACA_Animate, private service: MapService){
    }

    ngOnInit(){
    	this.setupUpdate();

    	this.draw = this.a.animation(() => {
			setTimeout(() => {
				this.updatePins();
			}, 20);
    		return this.update();
        }, () => {
        	this.render();
			setTimeout(() => {
				this.updatePins();
			}, 60);
        });
    	this.checkStatus(null, 0);
    	this.status_check = setInterval(() => {
    		this.checkStatus(null, 0);
    	}, 1000);
    	this.zoom = this._zoom;
    }

	ngOnDestroy() {
		if(this.status_check) {
			clearInterval(this.status_check);
		}
	}

    update() {
        	// Clean up any dimension changes
        if(!this.isFocus) {
	        if(this._zoom > this.zoomMax || this._zoom > ZOOM_LIMIT) this._zoom = this.zoomMax;
	        else if (this._zoom < -50) this._zoom = -50;
		    if(this._zoom !== this.zoom && this.zoom) { // Update pos
				if(isNaN(this._zoom)) this._zoom = this.zoom;
				if(isNaN(this.zoom)) this.zoom = this._zoom;
		    	let zoom_change = this._zoom / (this.zoom);
				if(isNaN(zoom_change)) zoom_change = 1;
		    }

	    }
        this.zoom = this._zoom;
        this.zoomChange.emit(this._zoom);
        this.rotate = this.rotate % 360;
		let p_z_state = this.zoom_state;
		this.zoom_state = Math.round(100 + this._zoom).toString();
		if(this.zoom_state !== p_z_state) {
			setTimeout(() => {
				this.updateBoxes();
			}, 60);
		}
        return true;
    }

    render() {
        	// Update map
        if(this.map_display && this.active) {
	        //this.updateBoxes();
			if(this.content_box) {
				let mbb = this.map_item.getBoundingClientRect();
				if(mbb){
					let top = Math.round(-mbb.height * this.center.y + this.content_box.height/2);
					let left = Math.round(-mbb.width * this.center.x + this.content_box.width/2);
			        this.map_display.nativeElement.style.top = top + 'px';
			        this.map_display.nativeElement.style.left = left + 'px';
				}
			}
	        if(this.isFocus) this.finishFocus();
	    }
    }

    clearDisabled(strs:string[]) {
        for(let i = 0; i < strs.length; i++) {
        	let el = this.map_display.nativeElement.querySelector('#' + this.escape(strs[i]));
        	if(el !== null) {
        		el.style.display = 'inherit';
        	}
        }
    }

    setupDisabled() {
    	if(this.active) {
	        for(let i = 0; i < this.disable.length; i++) {
	        	let el = this.map_display.nativeElement.querySelector('#' + this.escape(this.disable[i]));
	        	if(el !== null) {
	        		el.style.display = 'none';
	        	}
	        }
	    }
    }

    setupStyles() {
    	if(!this.mapStyles || !this.map_area) return;
    	for(let i = 0; i < this.mapStyles.length; i++){
    		let style = this.mapStyles[i];
        	let el = this.map_area.nativeElement.querySelector('#' + this.escape(style.id));
        	if(el) {
        		if(style.color) el.style.color = style.color;
        		if(style.opacity) el.style.opacity = style.opacity;
        		if(style.fill) el.style.fill = style.fill;
        	}
    	}
    }

    clearPins() {
    	this.pins = [];
    }

    isVisible() {
    	if(this.self) {
    			//Check if the map area is visiable
    		let bb = this.self.nativeElement.getBoundingClientRect();
    		if(bb.left + bb.width < 0) return false;
    		else if(bb.top + bb.height < 0) return false;
    		else if(bb.top > window.innerHeight) return false;
    		else if(bb.left > window.innerWidth) return false;
    		return true;
    	}
    	return false;
    }

    setupPins() {
    	if(this.active && this.pins) {
	    	this.pin_cnt = this.pins.length;
			setTimeout(() => {
		        for(let i = 0; i < this.pins.length; i++) {
		        	let pin = this.pins[i];
		        	if(typeof pin !== 'object') {
		        		pin = this.pin_defaults;
		        	} else {
		        		if(!pin.x) pin.x = this.pin_defaults.x;
		        		if(!pin.y) pin.x = this.pin_defaults.y;
		        		if(!pin.colors) pin.x = this.pin_defaults.colors;
		        		else {
		        			if(!pin.colors.one   || pin.colors.one.length > 25) pin.colors.one = this.pin_defaults.colors.one;
		        			if(!pin.colors.two   || pin.colors.one.length > 25) pin.colors.two = this.pin_defaults.colors.two;
		        		}
		        	}
		        	let el = this.map_area.nativeElement.querySelector('#aca-map-pin' + i);
		        	if(el !== null) {
			        	let html = this.getPin(pin, i);
			        	let text = el.children[el.children.length-1];
			        	el.innerHTML = html;
			        	if(text) el.appendChild(text);
		        	}
		        	this.pins[i].status = 'show';
		        }
				this.updatePins();
			}, 20);
	    }
    }

	updatePins() {
		if(!this.map_item) return;
		for(let i = 0; i < this.pins.length; i++) {
			let pin = this.pins[i];
			let el = this.map_area.nativeElement.querySelector('#aca-map-pin' + i);
			if(el) {
					// Get bounding rectangles
				let ebb = el.getBoundingClientRect();
				let cbb = this.map_area.nativeElement.getBoundingClientRect();
				let mb = this.map_item.getBoundingClientRect();
				let elc = this.map_display.nativeElement.querySelector('#' + this.escape(pin.id));
					// Get map scale
				let dir = this.map_box ? (mb.width > mb.height) : true;
				let map_x = Math.ceil(dir ? this.mapSize : (this.mapSize * (mb.width / mb.height)));
				let map_y = Math.ceil(!dir ? this.mapSize : (this.mapSize * (mb.height / mb.width)));

				let p_y = Math.round((pin.y ? Math.min(map_y, pin.y) / map_y : mb.width / mb.height) * mb.height);
				let p_x = Math.round((pin.x ? Math.min(map_x, pin.x) / map_x : 1) * mb.width);
					// Get bounding rectangle of pin location
				let ccbb = {
					width: 2, height: 2,
					left: p_x + (mb.left - cbb.left) + cbb.left,
					top: p_y + (mb.top - cbb.top) + cbb.top
				}
				let bb = pin.id && pin.id !== '' && elc ? elc.getBoundingClientRect() : ccbb;
					// Get pin location
				let y = (bb.top + bb.height/2) - el.clientHeight - cbb.top;
				let x = (bb.left + bb.width/2) - el.clientWidth/2 - cbb.left;
					// Update pin display location.
				el.style.top = Math.round(y) + 'px';
				el.style.left = Math.round(x) + 'px';
			}
		}
	}

    escape (value) {
		var string = String(value);
		var length = string.length;
		var index = -1;
		var codeUnit;
		var result = '';
		var firstCodeUnit = string.charCodeAt(0);
		while (++index < length) {
			codeUnit = string.charCodeAt(index);
			// Note: there’s no need to special-case astral symbols, surrogate
			// pairs, or lone surrogates.

			// If the character is NULL (U+0000), then the REPLACEMENT CHARACTER
			// (U+FFFD).
			if (codeUnit == 0x0000) {
				result += '\uFFFD';
				continue;
			}

			if (
				// If the character is in the range [\1-\1F] (U+0001 to U+001F) or is
				// U+007F, […]
				(codeUnit >= 0x0001 && codeUnit <= 0x001F) || codeUnit == 0x007F ||
				// If the character is the first character and is in the range [0-9]
				// (U+0030 to U+0039), […]
				(index == 0 && codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
				// If the character is the second character and is in the range [0-9]
				// (U+0030 to U+0039) and the first character is a `-` (U+002D), […]
				(
					index == 1 &&
					codeUnit >= 0x0030 && codeUnit <= 0x0039 &&
					firstCodeUnit == 0x002D
				)
			) {
				// https://drafts.csswg.org/cssom/#escape-a-character-as-code-point
				result += '\\' + codeUnit.toString(16) + ' ';
				continue;
			}

			if (
				// If the character is the first character and is a `-` (U+002D), and
				// there is no second character, […]
				index == 0 &&
				length == 1 &&
				codeUnit == 0x002D
			) {
				result += '\\' + string.charAt(index);
				continue;
			}

			// If the character is not handled by one of the above rules and is
			// greater than or equal to U+0080, is `-` (U+002D) or `_` (U+005F), or
			// is in one of the ranges [0-9] (U+0030 to U+0039), [A-Z] (U+0041 to
			// U+005A), or [a-z] (U+0061 to U+007A), […]
			if (
				codeUnit >= 0x0080 ||
				codeUnit == 0x002D ||
				codeUnit == 0x005F ||
				codeUnit >= 0x0030 && codeUnit <= 0x0039 ||
				codeUnit >= 0x0041 && codeUnit <= 0x005A ||
				codeUnit >= 0x0061 && codeUnit <= 0x007A
			) {
				// the character itself
				result += string.charAt(index);
				continue;
			}

			// Otherwise, the escaped character.
			// https://drafts.csswg.org/cssom/#escape-a-character
			result += '\\' + string.charAt(index);

		}
		return result;
	}

    getPin(data: any, i: number) {
    	let pin = this.pin_html;
    	pin = this.replaceAll(pin, '#DC6900', data.colors.one);
    	pin = this.replaceAll(pin, '#FFFFFF', data.colors.two);
    	pin = this.replaceAll(pin, 'aca-', ('aca-' + i + '-'));
    	return pin;
    }

    private replaceAll(str, find, replace) {
  		return str.replace(new RegExp(find, 'g'), replace);
	}

    ngAfterViewInit() {
    }

	setupEvents() {
        if(Hammer && this.map_item && (!this.focus || this.focus === '' || this.focusScroll)){
                // Setup events via Hammer.js if it is included
            this.de = new Hammer(document, {});
            this.de.on('tap', (event) => { this.checkStatus(event, 0); })
            this.touchmap = new Hammer(this.map_item, {});
                //Tap Map
            this.touchmap.on('tap', (event) => {this.tapMap(event);});
                //Moving Map
            this.touchmap.on('pan', (event) => {this.moveMap(event);});
            this.touchmap.on('panend', (event) => {this.moveEnd(event);});
            this.touchmap.get('pan').set({ directive: Hammer.DIRECTION_ALL, threshold: 5 });
                // Scaling map
            this.touchmap.on('pinch', (event) => {this.scaleMap(event);});
            this.touchmap.on('pinchend', (event) => {this.scaleEnd(event);});
            this.touchmap.get('pinch').set({ enable: true });
        } else if(this.map_item){
                //Setup Normal Events

                //*/
        }
        this.setupPins();
        if(this.focus) this.updateFocus();
	}

   	checkStatus(e, i) {
   		if(i > 2) return;
   		let visible = false;
   		let el = this.self.nativeElement;
   		while(el) {
   			if(el.nodeName === 'BODY') {
   				visible = true;
   				break;
   			}
   			el = el.parentNode;
   		}
   		if(visible) visible = this.isVisible();
   		if(!visible) {
   			this.active = false;
   			this.loading = true;
   			//setTimeout(() => { this.checkStatus(e, i+1); }, 50);
   		} else {
   			if(this.active !== visible)  {
   				this.active = true;
   				setTimeout(() => {
   					this.loadMapData();
   				}, 100);
   			}
   		}
   	}

    ngAfterContentInit() {

    }

    ngOnChanges(changes: any){
        if(changes.map){
            this.loadMapData();
        }
        if(changes.zoom) {
        	this._zoom = isNaN(this.zoom) ? 0 : this.zoom;
        	if(this.draw !== null) this.updateBoxes();
        }
        if(changes.disable) {
        	let pv = changes.disable.previousValue;
        	if(pv !== null && pv !== undefined) this.clearDisabled(pv);
        	this.setupDisabled();
        }
        if(changes.pins && this.pins) {
        	this.pin_cnt = this.pins.length;
        	this.setupPins();
        }
        if(changes.mapStyles) {
        	this.setupStyles();
        }
        if(changes.focus ) {
        	this.updateFocus();
        }
    }

    updateFocus() {
    	if(!this.map_display || !this.map_data) return;
    	if(this.focus === null || this.focus === undefined || this.focus === '') return;
    	this.zoomMax = 2000;
		if(this.map_item && this.map_area) {
			let bb = this.getFocusBB();
			if(bb) this.zoomFocus(bb);
			else this.retryFocus();
		} else this.retryFocus();
    }

	zoomFocus(bb: any) {
		let cbb = this.map_item.getBoundingClientRect();
		let mbb = this.map_area.nativeElement.getBoundingClientRect();
		if(cbb && mbb && bb) {
			this.zoom_bb = bb;
			setTimeout(() => {
				let w_ratio = mbb.width  / bb.width  * (cbb.width / mbb.width );
				let h_ratio = mbb.height  / bb.height  * (cbb.height / mbb.height );
				let r = (w_ratio < h_ratio ? w_ratio : h_ratio) * ( typeof this.focus === 'string' ? 0.5 : 1.5);
				this._zoom = Math.round((isNaN(r) ? 1 : r) * this.focusZoom);
				this.isFocus = true;
				this.redraw()
				this.updateBoxes();

			}, 20);
		}
	}

	retryFocus() {
		setTimeout(() => {
			this.updateFocus();
		}, 100)
	}

	getFocusBB() {
		if(this.focus && typeof this.focus === 'string' && this.focus !== '') {
			let el = this.map_display.nativeElement.querySelector('#' + this.escape(this.focus));
			if(el !== null) {
				this.zoom_bb = el.getBoundingClientRect();
			}
		} else if(this.focus && typeof this.focus === 'object') {
			if(this.focus.x > 0 && this.focus.y > 0) {
					// Get content bounding boxes
				let cbb = this.map_area.nativeElement.getBoundingClientRect();
				let mb = this.map_item.getBoundingClientRect();
					// Get point position
				let dir = this.map_box ? (mb.width > mb.height) : true;
				let map_x = Math.ceil(dir ? this.mapSize : (this.mapSize * (mb.width / mb.height)));
				let map_y = Math.ceil(!dir ? this.mapSize : (this.mapSize * (mb.height / mb.width)));

				let p_y = Math.round((this.focus.y ? Math.min(map_y, this.focus.y) / map_y : mb.width / mb.height) * mb.height);
				let p_x = Math.round((this.focus.x ? Math.min(map_x, this.focus.x) / map_x : 1) * mb.width);
					// Get bounding rectangle of pin location
				let ccbb = {
					width: 128, height: 128,
					left: p_x + (mb.left - cbb.left) + cbb.left,
					top: p_y + (mb.top - cbb.top) + cbb.top
				}
				this.zoom_bb = ccbb;
			}
		}
		return this.zoom_bb;
	}

    finishFocus() {
		this.isFocus = false;
		let cnt = 0;
		let interval = setInterval(() => {
				// Get content bounding boxes
			let cbb = this.map_area.nativeElement.getBoundingClientRect();
			let mbb = this.map_item.getBoundingClientRect();
			let coord = typeof this.focus === 'object' && this.focus.x && this.focus.y;
			this.getFocusBB();
			let bb = this.zoom_bb;
			let x = bb.left + bb.width/2 - mbb.left;
			let y = bb.top + bb.height/2 - mbb.top;
			this.focusOnPoint(x, y);

			this.zoom_bb = null;
			this.updateBoxes();
			cnt++;
			if(cnt > 5) {
				clearInterval(interval);
			}
		}, 50);
    }

	focusOnPoint(x: number, y: number) {
		let mbb = this.map_item.getBoundingClientRect();
		let r_x = x / mbb.width;
		let r_y = y / mbb.height;
		this.center = { x: r_x, y: r_y };
		this.redraw();
	}

    loadMapData() {
        this.loading = true;
    	this.map_data = null;
    	if(this.active) {
	        this.map_display.nativeElement.innerHTML = '';
	    	if(this.map && this.map.indexOf('.svg') >= 0 && this.map.length > 4) {
		    	this.service.getMap(this.map).then((data) => {
		    		this.map_data = data;
		    		this.setupMap();
		    	}, (err) => {
		    		console.error('ACA_WIDGETS: Error loading map "' + this.map + '".');
		    		console.error(err);
		    	});
		    } else {
		    	if(!this.map) console.error('ACA_WIDGETS: Path to map is not valid.');
		    	else if(this.map.indexOf('.svg') < 0) console.error('ACA_WIDGETS: Path to map is not an SVG.');
		    	else if(this.map.length > 4) console.error('ACA_WIDGETS: Path to map is not long enough. It needs to be longer than 4 characters');
		    	else console.error('ACA_WIDGETS: Unknown error loading map with map path "' + this.map + '".');
		    }
		} else {
			setTimeout(() => {
				this.loadMapData();
			}, 200);
		}
    }

    setupMap(){
        if(this.map_data){
            this.map_display.nativeElement.innerHTML = this.map_data;
            this.map_item = this.map_display.nativeElement.children[0];
            this.map_item.style[this.map_orientation] = '100%';
            this.zoomed = true;
            setTimeout(() => { this.resize(); this.updateBoxes(); }, 200);
        	this.setupDisabled();
        	this.setupPins();
        	this.setupStyles();
			this.setupEvents();
        	setTimeout(() => {
		    	this.loading = false;
        	}, 100);
        }
    }

    move = {
        x : 0,
        y : 0
    }

    tapMap(event) {
            //Traverse map and return array of clicked elements
        let elems = [];
        let el = this.map_item;
		if(event && this.map_item) {
			let mbb = this.map_item.getBoundingClientRect();
			console.debug((event.center.x - mbb.left).toString(), (event.center.y - mbb.top).toString());
		}
        elems = this.getItems(event.center, el);
        this.tap.emit(elems);
    }

    getItems(pos, el) {
        let elems = []
        for(var i = 0; i < el.children.length; i++){
            let rect = el.children[i].getBoundingClientRect();
            if(pos.y >= rect.top && pos.y <= rect.top + rect.height &&
               pos.x >= rect.left && pos.x <= rect.left + rect.width) {
                if(el.children[i].id) elems.push(el.children[i].id);
                let celems = this.getItems(pos, el.children[i]);
                elems = elems.concat(celems);
            }
        }
        return elems;
    }

    moveMap(event) {
		if(this.move_timer) {
        	this.move.x = event.deltaX;
        	this.move.y = event.deltaY;
			clearTimeout(this.move_timer);
			this.move_timer = null;
		}
    	let dX = +event.deltaX - +this.move.x;
		dX = (Math.min(this.min, +Math.abs(dX)) * (dX < 0 ? -1 : 1));
    	let dY = +event.deltaY - +this.move.y;
		dY = (Math.min(this.min, +Math.abs(dY)) * (dY < 0 ? -1 : 1));

        this.center.y -= (dY/this.map_box.height);
        this.center.x -= (dX/this.map_box.width);

		if(this.center.x < this.min_center.x) this.center.x = this.min_center.x;
		else if(this.center.x > this.max_center.x) this.center.x = this.max_center.x;

		if(this.center.y < this.min_center.y) this.center.y = this.min_center.y;
		else if(this.center.y > this.max_center.y) this.center.y = this.max_center.y;

        	// Update the display of the map
        this.redraw();
        this.move.x = event.deltaX;
        this.move.y = event.deltaY;
        if(this.min < 100) this.min += 10;
    }

    moveEnd(event) {
		if(this.move_timer) {
			clearTimeout(this.move_timer);
			this.move_timer = null;
		}
		console.log(this.center);
		this.move_timer = setTimeout(() => {
	        this.move.x = this.move.y = 0;
	        this.activate = false;
	        this.min = 1;
		}, 20);
    }


    dZoom = 1;

    scaleMap(event) {
		let scale = event.scale - this.dZoom;
		let dir = scale / Math.abs(scale);
		let c_zoom = 100 + this._zoom;

        this._zoom = (isNaN(c_zoom) ? 1 : c_zoom) * (1 + dir * Math.max(Math.abs(scale), 0.05) / 4 ) - 100;
        this.redraw();
	    this.updateBoxes();
        this.dZoom += scale;
    }

    scaleEnd(event) {
    	this.dZoom = 1
    }

    zoomIn() {
        this._zoom += Math.max(Math.abs(Math.round((100 + this._zoom)/100)) * 10, 10);
        this.redraw();
	    this.updateBoxes();
		setTimeout(() => {
			this.redraw();
		}, 100);
    }

    zoomOut() {
        this._zoom -= Math.max(Math.abs(Math.round((100 + this._zoom)/100)) * 10, 10);
        this.redraw();
	    this.updateBoxes();
		setTimeout(() => {
			this.redraw();
		}, 100);
    }

    resetZoom() {
        this._zoom = 0;
		this.center = { x: 0.5, y: 0.5 };
        this.redraw();
	    this.updateBoxes();
		setTimeout(() => {
			this.redraw();
		}, 100);
    }

    private redraw(){
    	this.draw.animate();
    }

    resize() {
        this.content_box = this.self.nativeElement.getBoundingClientRect();
        if(this.map_item && this.map_display) {
            let rect = this.map_item.getBoundingClientRect();
            let md = this.map_display.nativeElement;
        }
        this.updateBoxes();
	    this.updateFocus();
     	this.loading = false;
    }

    updateAnimation: any;

    setupUpdate() {
    	this.updateAnimation = this.a.animation(() => {}, () => {
    		if(!this.content_box && this.self) {
        		this.content_box = this.self.nativeElement.getBoundingClientRect();
    		}
    		if(this.map_display && this.content_box) {
		        //this.map_box = this.map_display.nativeElement.getBoundingClientRect();
			    this.map_box = this.map_item.getBoundingClientRect();
		        this.zoomChange.emit(this.zoom);
				this.min_center = {
					x: -((this.map_box.width-this.content_box.width)/this.map_box.width) + 0.5,
					y: -((this.map_box.height-this.content_box.height)/this.map_box.height) + 0.5
				};
				this.max_center = {
					x: ((this.map_box.width-this.content_box.width)/this.map_box.width) + 0.5,
					y: ((this.map_box.height-this.content_box.height)/this.map_box.height) + 0.5
				};
		        this.redraw();
				if(this.box_update) clearTimeout(this.box_update);
				this.box_update = setTimeout(() => {
					this.updateBoxes();
				}, 2000);
		    }
	    });
    }

    updateBoxes() {
		if(this.box_update) clearTimeout(this.box_update);
		this.box_update = setTimeout(() => {
	    	this.updateAnimation.animate();
		}, 100);
    }

}
