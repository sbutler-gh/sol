import supabase from '$lib/db';
// import { dev } from '$app/env';



export async function post(request) {

  console.log('submitting json');
  console.log(request);

//   let geojson_feature = JSON.parse(request.body.get('geojson_feature'));
//   console.log(geojson_feature);

  const { data, error } = await supabase
  .from('initiatives')
  .insert([
    { 
      lng: request.body.get('lng'),
      lat: request.body.get('lat'),
      lng_lat: request.body.get('lng_lat'),
      // name: request.body.get('title'),
      name: request.body.get('name')
    //   geojson_feature: geojson_feature,
    //   geo_id: request.body.get('geo_id'),
    //   geo_index: 'osm',
    //   location_name: request.body.get('location_name'),
    //   country_code: request.body.get('country_code')
        }
    ]);

  if (error) {
    return {
      status: error.status,
      body: error.message
    }
  }

  return {
    status: 200,
    body: data,
    id: data[0].id
    // headers: {
    //   'set-cookie': `Path=/; HttpOnly; Secure; SameSite=Strict; Expires=${new Date(session.expires_at * 1000).toUTCString()};`
    // }
  }
}