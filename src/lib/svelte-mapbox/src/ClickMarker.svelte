<script>
  import { onMount } from 'svelte'
  import { getContext } from 'svelte'
  import { createEventDispatcher } from 'svelte';
  import { contextKey } from './mapbox.js'

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
  export let label = 'Marker'
  export let type = 'Marker'
  export let popupClassName = 'beyonk-mapbox-popup'
  export let markerOffset = [ 0, 0 ]
  export let popupOffset = 10
  export let color
  // export let color = randomColour()
  export let popup = true
  
  let marker
  let element
  let elementPopup
  let campaign_form = false;
  let campaign_name;
  const dispatch = createEventDispatcher();

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
        let popuphtml = ``
        // popupEl.setHTML(`<strong>type</strong><br>content`)
        popupEl.setHTML(popuphtml)
      }

      marker.setPopup(popupEl)
    }

    marker
      .setLngLat({ lng, lat })
      // .setHTML(`<button>Create Campaign</button>`)
      .addTo(map)

    return () => marker.remove()
  })

  export function getMarker () {
    return marker
  }

  function createCampaign(e) {
    console.log(e.target);
    dispatch('campaign', {
			name: campaign_name
		});
  }
</script>

<div bind:this={element}>
  <p style="text-align: center; font-size: 20px; text-shadow: purple 1px 1px 10px 10px; margin-bottom: 0px;">🔴
    <br>
    <button style="margin-left: auto;" on:click|preventDefault={function() { !campaign_form ? campaign_form = true : null; }}>Create Campaign</button>
  </p>
<slot></slot>
</div>

<div class='popup' bind:this={elementPopup}>
  <slot name="popup"></slot>
  <form on:submit|preventDefault={createCampaign} style="background: white;">
    <input bind:value={campaign_name} placeholder="Campaign Name">
    <button type="submit">Create Campaign</button>
  </form>
</div>

<style>
</style>
