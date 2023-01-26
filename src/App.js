import * as turf from '@turf/turf';
import { Icon } from 'leaflet';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet/dist/leaflet.css';
import React, { useEffect, useState } from 'react';
import { FeatureGroup, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import { allProperties } from './data';

export const icon = new Icon({
  iconUrl: '/images/Logo.png',
  iconSize: [35, 35],
});

function App() {
  const propertiesLatLong = allProperties.map((property) => property.details.coordinates);
  const [mapLayers, setMapLayers] = useState([]);
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [propertiesInScope, setPropertiesInScope] = useState([]);

  useEffect(() => {
    if (polygonPoints.length) {
      //all the coordinates of the properties
      const points = turf.points(propertiesLatLong);
      let properties2 = [];
      polygonPoints.forEach((singlePolygonPoints) => {
        //all the polygon (draw) coordinates
        const searchWithin = turf.polygon([[...singlePolygonPoints.coordinates]]);
        //finds all the properties within the polygon
        const pointsWithin = turf.pointsWithinPolygon(points, searchWithin);
        //turf give us back an array of object, we go through it and we find amongst all the properties, the ones that have the same coordinates, and we add it to the array
        if (pointsWithin.features.length) {
          pointsWithin.features.forEach((feature) => {
            let property = allProperties.find(
              (property) => property.details.coordinates === feature.geometry.coordinates
            );
            if (property) {
              properties2.push({ ...property, leafletId: singlePolygonPoints.id });
            }
          });
        }
      });
      setPropertiesInScope((properties) => {
        const propInScope = [...properties, ...properties2];
        return [...new Set(propInScope.flat())];
      });
    }

    //don't add propertiesLatLong will cause infinite loop
  }, [polygonPoints]);

  const createDraw = (e) => {
    setPropertiesInScope([]);
    const { layerType, layer } = e;
    if (layerType === 'polygon') {
      const { _leaflet_id: leafletId } = layer;
      //in case of multi poligon, we want a way to know which coordinate belongs to which polygon, hence we add an id.
      setMapLayers((layers) => [...layers, { id: leafletId, latLngs: layer.getLatLngs()[0] }]);

      //we create a polygon coordinate array as they are needed for turf to check which properties are inside or not.
      setPolygonPoints((layers) => {
        return [
          ...layers,
          {
            id: leafletId,
            coordinates: layer.toGeoJSON().geometry.coordinates[0].map((latLng) => [latLng[1], latLng[0]]),
          },
        ];
      });
    }
  };

  const editDraw = (e) => {
    const {
      layers: { _layers },
    } = e;
    setPropertiesInScope([]);
    Object.values(_layers).map(({ _leaflet_id, editing }) => {
      //we reset the edited coordinate of the selected polygon
      setMapLayers((layers) =>
        layers.map((l) => {
          return l.id === _leaflet_id ? { ...l, latLngs: { ...editing.latlngs[0] } } : 1;
        })
      );

      setPolygonPoints((layers) =>
        layers.map((l) => {
          //first and last coordinate need to be the same. toGeoJson()does that for us, but it's not available during editing
          const coordinates = [
            ...editing.latlngs[0][0].map((l) => [l.lat, l.lng]),
            [editing.latlngs[0][0][0].lat, editing.latlngs[0][0][0].lng],
          ];

          return l.id === _leaflet_id ? { ...l, coordinates } : { ...l };
        })
      );
    });
  };

  const deleteDraw = (e) => {
    const {
      layers: { _layers },
    } = e;
    Object.values(_layers).map(({ _leaflet_id }) => {
      //remove the selected polygon through his id
      setMapLayers((layers) => layers.filter((l) => l.id !== _leaflet_id));
      setPropertiesInScope((properties) => properties.filter((property) => property.leafletId !== _leaflet_id));
      setPolygonPoints((layers) => layers.filter((l) => l.id !== _leaflet_id));
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignContent: 'center',
        justifyContent: 'center',
        border: 'black',
        margin: '10px',
      }}
    >
      <MapContainer
        center={[55.860916, -4.251433]}
        zoom={13}
        scrollWheelZoom={false}
        style={{ width: '50%', height: 450 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        {propertiesInScope.length &&
          propertiesInScope.map(({ id, details }) => {
            return (
              <Marker key={id} position={details.coordinates} icon={icon}>
                <Popup>
                  <div>
                    <h2>{id}</h2>
                    <p>Rent: {details.averageRent}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        <FeatureGroup>
          <EditControl
            position='topright'
            onEdited={editDraw}
            onCreated={createDraw}
            onDeleted={deleteDraw}
            draw={{
              polygon: true,
              rectangle: false,
              polyline: false,
              circle: false,
              circlemarker: false,
              marker: false,
            }}
          />
        </FeatureGroup>
      </MapContainer>
    </div>
  );
}

export default App;
