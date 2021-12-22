import supabase from '$lib/db';
// import { is_dev_store, is_dev } from '$lib/stores';
import { dev } from '$app/env';

export const get = async () => {

    try {
      const { data: table, error } = await supabase
      .from('initiatives')
      .select('*');
      
      return {
          body: JSON.stringify({ table, error })
      };
  }
    catch (e) {
      console.log({ e });
      return {
          body: JSON.stringify({ e })
      };
  }
}