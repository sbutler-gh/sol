# 🌱 Native

Perhaps the distinction of park, green space, sidewalk, trail, and yard are all temporary distinctions, given that nature is currently constrained to 'park' boundaries.

And in a world where nature stretches across a community -- flowing along sidewalks, curving through yards and gardens, opening and flourishing into green spaces and what we once called 'parks', the whole community will be a park, with no start or end or bounds, and a sovereign nature on that place -- and to be a human or a deer or a bee in it, is to be immersed in it. 

What better place to live?

#### Problem

At least 70% of plant biomass in land, parks, green spaces, and yards should be flourishing native species -- in order to support biodiversity, ecological health, food and water security, soil health -- and consequently, the wellbeing of all life in those places. 

In more sobering words, if we don't have sufficient native species across lands, those places can become dead zones — unsupportive to life. 

More details: *The problem, Tallamy explained, is with the picky diets of plant-eating insects. Most of these bugs—roughly 90%—eat and reproduce on only certain native plant species, specifically those with whom they share an evolutionary history. Without these carefully tuned adaptations of specific plants, insect populations suffer. And because bugs themselves are a key food source for birds, rodents, amphibians, and other critters, that dependence on natives—and the consequences of not having them—works its way up the food chain. Over time, landscapes that consist mainly of invasive or nonnative plants could become dead zones.* (https://www.yesmagazine.org/environment/2020/02/07/yard-sustainability-native-plants)


#### Solution

An outcome in which 70% of land biomass is flourishing with native species. Solutions are ways of facilitating they outcome. 

This repository includes one possible solution: 🌱 **Native** 

Native is a tool that enables people to see nature flourishing on the land around them, learn the native plant species which generate that future, and signal for that location to be planted with those species -- to plant that future. 

People with planting experience can view published locations and native plant species, collect the appropriate seeds for those species, and then go to the location -- and start planting the native future there. 

This can take place on public greens, city parks, sidewalks, trails, residential yards, and deprecated abandoned lands.

## Use this tool locally

First, clone this repository locally and install dependences with `npm install`.

You'll also need to set-up a [Supabase account](supabase.com), create an orgnization in Supabase, and create a table named `native-here` that includes (at least) these columns:

* **lng** (type: text)
* **lat** (type: text)
* **lng_lat** (type: jsonb)
* **type** (type: jsonb)
* **content** (type: jsonb)
* **title** (type: jsonb)

Finally, Supabase URL and Supabase anon key in the `.env` file.

This will initiate the application locally with a connection to the freshly created table.

To start the development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

Before creating a production version of your app, install an [adapter](https://kit.svelte.dev/docs#adapters) for your target environment. Then:

```bash
npm run build
```

> You can preview the built app with `npm run preview`, regardless of whether you installed an adapter. This should _not_ be used to serve your app in production.
