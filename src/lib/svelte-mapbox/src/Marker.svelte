<script>
  import { onMount } from 'svelte'
  import { getContext } from 'svelte'
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
  export let name;
  export let content
  export let popupClassName = 'beyonk-mapbox-popup'
  export let markerOffset = [ 0, 0 ]
  export let popupOffset = 10
  export let color
  export let twitter_id;
  // export let color = randomColour()
  export let popup = true;

  let feed;
  
  let marker
  let element
  let elementPopup


  $: marker && move(lng, lat)

  onMount(() => {
    
    // if (twitter_id) {
    //   fetchTweets();
    // }

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
        if (name) {
        // popuphtml = "<strong>" + type + "</strong> <br>" + content;
        // popupEl.setHTML(`<strong>${type}</strong><br>${content}`)
        popupEl.setHTML(`<strong>${name} + ${feed}</strong>`)
        }
        else {
        // popupEl.setHTML(`<strong>type</strong><br>content`)
        popupEl.setHTML(`<button>Create Campaign</button>`)


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

  async function fetchTweets() {
    // let response = await fetch(`https://serene-journey-42564.herokuapp.com/https://api.twitter.com/2/users/${twitter_id}/tweets?expansions=attachments.poll_ids,attachments.media_keys,author_id,entities.mentions.username,geo.place_id,in_reply_to_user_id,referenced_tweets.id,referenced_tweets.id.author_id&tweet.fields=attachments,author_id,context_annotations,conversation_id,created_at,entities,geo,id,in_reply_to_user_id,lang,possibly_sensitive,public_metrics,referenced_tweets,reply_settings,source,text,withheld&user.fields=created_at,description,entities,id,location,name,pinned_tweet_id,profile_image_url,protected,public_metrics,url,username,verified,withheld&place.fields=contained_within,country,country_code,full_name,geo,id,name,place_type&poll.fields=duration_minutes,end_datetime,id,options,voting_status&media.fields=duration_ms,height,media_key,preview_image_url,type,url,width,public_metrics,non_public_metrics,organic_metrics`, {
      let response = await fetch(`https://serene-journey-42564.herokuapp.com/https://api.twitter.com/2/users/${twitter_id}/tweets`, {

      method: 'get',
      headers: {
        "Authorization": `Bearer ${import.meta.env.VITE_TWITTER_BEARER_TOKEN}`
      }
    })

    // expansions=attachments.poll_ids,attachments.media_keys,author_id,entities.mentions.username,geo.place_id,in_reply_to_user_id,referenced_tweets.id,referenced_tweets.id.author_id&tweet.fields=attachments,author_id,context_annotations,conversation_id,created_at,entities,geo,id,in_reply_to_user_id,lang,possibly_sensitive,public_metrics,referenced_tweets,reply_settings,source,text,withheld&user.fields=created_at,description,entities,id,location,name,pinned_tweet_id,profile_image_url,protected,public_metrics,url,username,verified,withheld&place.fields=contained_within,country,country_code,full_name,geo,id,name,place_type&poll.fields=duration_minutes,end_datetime,id,options,voting_status&media.fields=duration_ms,height,media_key,preview_image_url,type,url,width,public_metrics,non_public_metrics,organic_metrics,promoted_metric

    if (response) {
      let data = await response.json();
      console.log(data);
    }

    else {
      console.log(error);
    }
  }
</script>

<div bind:this={element}>
{#if !name}
<button>Create Campaign</button>
{/if}
<slot></slot>
</div>

<div class='popup' bind:this={elementPopup}>
  <slot name="popup"></slot>
</div>

<style>
  .popup {
    background-image: 'https://picsum.photos/200';
  }
</style>
