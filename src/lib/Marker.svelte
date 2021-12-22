<script>
    import { onMount } from 'svelte'
    import { getContext } from 'svelte'
    import { contextKey } from '@beyonk/svelte-mapbox/src/mapbox.js'
  
    const { getMap, getMapbox } = getContext(contextKey)
    const map = getMap()
    const mapbox = getMapbox()
  
    function randomColour () {
      return Math.round(Math.random() * 255)
    }
  
    function move (lng, lat) {
      marker.setLngLat({ lng, lat })
    }
  
    export let lat
    export let lng
    // export let label = 'Marker'
    // export let type = 'Marker'
    export let name;
    export let content
    export let popupClassName = 'beyonk-mapbox-popup'
    export let markerOffset = [ 0, 0 ]
    export let popupOffset = 10
    export let color
    // export let color = randomColour()
    export let popup = true
    
    let marker
    let element
    let elementPopup
  
    $: marker && move(lng, lat)
  
    onMount(() => {
      if (element.hasChildNodes()) {
        marker = new mapbox.Marker({ element, offset: markerOffset })
      } else {
        marker = new mapbox.Marker({ color, offset: markerOffset })
      }
    
      if (popup) {
        const popupEl = new mapbox.Popup({
          offset: popupOffset,
          className: popupClassName
        })
        if (elementPopup.hasChildNodes()) {
          popupEl.setDOMContent(elementPopup)
        } else {
          let popuphtml;
          if (content) {
          // popuphtml = "<strong>" + type + "</strong> <br>" + content;
          // popupEl.setHTML(`<strong>${type}</strong><br>${content}`)
          popupEl.setHTML(`<strong>${name}</strong>`)
          }
          else {
          popupEl.setHTML(`<strong>Initiative</strong>`)
  
          // popuphtml = "<strong>" + type + "</strong>";
          }
          // popupEl.setHTML(popuphtml)
        }
  
        marker.setPopup(popupEl)
      }
  
      marker
        .setLngLat({ lng, lat })
        .addTo(map)
  
      return () => marker.remove()
    })
  
    export function getMarker () {
      return marker
    }
  </script>
  
  <div bind:this={element}>
  <slot ></slot>
  </div>
  
  <div class='popup' bind:this={elementPopup}>
    <slot name="popup"></slot>
  </div>
  
  <style>
    .popup {
      background-image: 'https://picsum.photos/200';
    }
  </style>
  