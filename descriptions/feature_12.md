# Feature Ticket 12 - Google Maps Place ID Finder

## Description

Add a new section to the dashboard that allows users to search for and retrieve a Google Maps Place ID.

The section should include:

* A search field for finding a location or place.
* Display of the corresponding Google Maps Place ID.
* A **Copy** button that copies the full Google Maps Place URL to the clipboard.

Example URL:

```text
https://www.google.com/maps/place/?q=place_id:ChIJg3SHgmJBXj4ROA7Q35O4wTw
```

Please follow the pattern for your implementation from google maps developer code as below

```js
// This sample uses the Place Autocomplete widget to allow the user to search
// for and select a place. The sample then displays an info window containing
// the place ID and other information about the place that the user has
// selected.

async function init() {
    // Request needed libraries.
    const [{ InfoWindow }, { AdvancedMarkerElement }] = await Promise.all([
        google.maps.importLibrary('maps'),
        google.maps.importLibrary('marker'),
        google.maps.importLibrary('places'),
    ]);

    const mapElement = document.querySelector('gmp-map');
    const map = mapElement.innerMap;

    const placeAutocomplete = document.querySelector('gmp-place-autocomplete');

    // Set the map options.
    map.setOptions({
        clickableIcons: false,
        mapTypeControl: false,
        streetViewControl: false,
    });

    // Use the bounds_changed event to bias results to the current map bounds.
    map.addListener('bounds_changed', () => {
        const bounds = map.getBounds();
        if (bounds) {
            placeAutocomplete.locationBias = bounds;
        }
    });

    const infoWindow = new InfoWindow();
    const infoWindowContent = document.getElementById('infowindow-content');

    infoWindow.setContent(infoWindowContent);

    const marker = new AdvancedMarkerElement({
        map,
        collisionBehavior: 'REQUIRED_AND_HIDES_OPTIONAL',
        gmpClickable: true,
    });

    marker.addEventListener('gmp-click', () => {
        infoWindow.open(map, marker);
    });

    placeAutocomplete.addEventListener(
        'gmp-select',
        async ({ placePrediction }) => {
            infoWindow.close();

            const place = placePrediction.toPlace();

            await place.fetchFields({
                fields: ['displayName', 'formattedAddress', 'location', 'id'],
            });

            if (!place.location) {
                return;
            }

            if (place.viewport) {
                map.fitBounds(place.viewport);
            } else {
                map.setCenter(place.location);
                map.setZoom(17);
            }

            // Set the position of the marker using the place ID and location.
            marker.position = place.location;
            // marker.setVisible(true); // AdvancedMarkerElement is visible by default when map and position are set.

            infoWindowContent.children.namedItem('place-name').textContent =
                place.displayName;
            infoWindowContent.children.namedItem('place-id').textContent =
                place.id;
            infoWindowContent.children.namedItem('place-address').textContent =
                place.formattedAddress;
            infoWindow.open(map, marker);
        }
    );
}

void init();
```


```html
<html>
    <head>
        <title>Place ID Finder</title>

        <link rel="stylesheet" type="text/css" href="./style.css" />
        <script type="module" src="./index.js"></script>
        <script>
            // prettier-ignore
            (g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=`https://maps.${c}apis.com/maps/api/js?`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})({
                key: "AIzaSyA6myHzS10YXdcazAFalmXvDkrYCp5cLc8"
            });
        </script>
    </head>
    <body>
        <gmp-map center="-33.8688, 151.2195" zoom="13" map-id="DEMO_MAP_ID">
            <gmp-place-autocomplete
                slot="control-inline-start-block-start"></gmp-place-autocomplete>
        </gmp-map>
        <div id="infowindow-content">
            <span id="place-name" class="title"></span><br />
            <strong>Place ID:</strong> <span id="place-id"></span><br />
            <span id="place-address"></span>
        </div>
    </body>
</html>
```

```css
/* 
 * Always set the map height explicitly to define the size of the div element
 * that contains the map. 
 */
gmp-map {
    height: 100%;
}

/* 
 * Optional: Makes the sample page fill the window. 
 */
html,
body {
    height: 100%;
    margin: 0;
    padding: 0;
    font-family: Arial, Helvetica, sans-serif;
}

#infowindow-content {
    display: none;
}

gmp-map #infowindow-content {
    display: inline;
}

gmp-place-autocomplete {
    position: absolute;
    height: 30px;
    width: 500px;
    top: 10px;
    left: 10px;
    box-shadow: 4px 4px 5px 0px rgba(0, 0, 0, 0.2);
    color-scheme: light;
    border-radius: 10px;
}
```