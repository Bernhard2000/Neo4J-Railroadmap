<template>
  <div>
    <h1>Neo4j Train Map Viewer</h1>

    <section>
      <h2>Station Map</h2>
      <div id="map" style="height: 60vh; width: 100%"></div>
    </section>

    <div class="import-button-container">
      <Button
        label="Import European Cities"
        icon="pi pi-cloud-download"
        class="p-button-raised p-button-secondary"
        @click="importEuropeanCities"
      />
    </div>

    <div class="main-content">
      <Panel header="Train Simulation" :toggleable="true">
        <div class="p-field">
          <label for="trainStartStation">Start Station:</label>
          <Select
            id="trainStartStation"
            v-model="trainSimulation.startNodeName"
            :options="stations"
            optionLabel="name"
            placeholder="Select Start Station"
            :editable="true"
            :showClear="true"
          />
        </div>
        <div class="p-field">
          <label for="trainEndStation">End Station:</label>
          <Select
            id="trainEndStation"
            v-model="trainSimulation.endNodeName"
            :options="stations"
            optionLabel="name"
            placeholder="Select End Station"
            :editable="true"
            :showClear="true"
          />
        </div>
        <Button label="Start Train" icon="pi pi-play" @click="startTrainAnimation" />
      </Panel>

      <Button
        label="Manage Data"
        icon="pi pi-database"
        class="p-button-raised p-button-primary"
        @click="displayManageDataDialog = true"
      />
    </div>

    <!-- Main Data Management Dialog -->
    <Dialog
      v-model:visible="displayManageDataDialog"
      header="Manage Station and Rail Line Data"
      :modal="true"
      :style="{ width: '75vw' }"
      :breakpoints="{ '960px': '100vw' }"
      class="p-fluid"
      :contentStyle="{ maxHeight: '70vh', overflow: 'auto' }"
    >
      <div class="p-grid p-nogutter">
        <div class="p-col-12 p-md-6">
          <Panel header="Existing Stations" :toggleable="true">
            <p v-if="pending">Loading stations...</p>
            <p v-else-if="error">Error: {{ error.message }}</p>
            <div v-else class="station-list-content">
              <ul>
                <li v-for="(station, index) in stations" :key="index">
                  {{ station.name }} ({{ station.latitude }}, {{ station.longitude }})
                  <div class="button-group">
                    <Button
                      label="Edit"
                      class="p-button-rounded p-button-text p-button-sm"
                      @click="openEditStationDialog(station)"
                    />
                    <Button
                      label="Delete"
                      class="p-button-rounded p-button-text p-button-sm p-button-danger"
                      @click="confirmDeleteStation(station)"
                    />
                  </div>
                </li>
              </ul>
            </div>
          </Panel>
        </div>
        <div class="p-col-12 p-md-6">
          <Panel header="Insert New Station" :toggleable="true">
            <form @submit.prevent="addNode">
              <div>
                <label for="nodeName">Station Name:</label>
                <input id="nodeName" v-model="newNode.name" type="text" required />
              </div>
              <div>
                <label for="nodeCity">City:</label>
              </div>
              <div>
                <label for="nodeLatitude">Latitude:</label>
                <input
                  id="nodeLatitude"
                  v-model.number="newNode.latitude"
                  type="number"
                  step="any"
                />
              </div>
              <div>
                <label for="nodeLongitude">Longitude:</label>
                <input
                  id="nodeLongitude"
                  v-model.number="newNode.longitude"
                  type="number"
                  step="any"
                />
              </div>
              <button type="submit">Add Station</button>
            </form>
          </Panel>
        </div>
        <div class="p-col-12 p-md-6">
          <Panel header="Existing Rail Lines" :toggleable="true">
            <p v-if="pending">Loading rail lines...</p>
            <p v-else-if="error">Error: {{ error.message }}</p>
            <div v-else class="station-list-content">
              <ul>
                <li v-for="(relationship, index) in relationships" :key="index">
                  {{ relationship.sourceName }} --({{ relationship.distance }} km)
                  {{ relationship.targetName }}
                  <div class="button-group">
                    <Button
                      label="Edit"
                      class="p-button-rounded p-button-text p-button-sm"
                      @click="openEditConnectionDialog(relationship)"
                    />
                    <Button
                      label="Delete"
                      class="p-button-rounded p-button-text p-button-sm p-button-danger"
                      @click="confirmDeleteConnection(relationship)"
                    />
                  </div>
                </li>
              </ul>
            </div>
          </Panel>
        </div>
        <div class="p-col-12 p-md-6">
          <Panel header="Create New Rail Line" :toggleable="true">
            <form @submit.prevent="addRelationship">
              <div>
                <label for="sourceNodeName">Source Station:</label>
                <Select
                  id="sourceNodeName"
                  v-model="newRelationship.sourceNodeName"
                  :options="stations"
                  optionLabel="name"
                  placeholder="Select a Station"
                  :editable="true"
                  :showClear="true"
                  required
                />
              </div>
              <div>
                <label for="targetNodeName">Target Station:</label>
                <Select
                  id="targetNodeName"
                  v-model="newRelationship.targetNodeName"
                  :options="stations"
                  optionLabel="name"
                  placeholder="Select a Station"
                  :editable="true"
                  :showClear="true"
                  required
                />
              </div>
              <button type="submit">Create Rail Line</button>
            </form>
          </Panel>
        </div>
      </div>
      <template #footer>
        <Button
          label="Close"
          icon="pi pi-times"
          class="p-button-text"
          @click="displayManageDataDialog = false"
        />
      </template>
    </Dialog>

    <!-- Edit Station Dialog -->
    <Dialog
      v-model:visible="displayEditStationDialog"
      header="Edit Station"
      :modal="true"
      class="p-fluid"
    >
      <div class="p-field">
        <label for="editStationName">Station Name:</label>
        <input id="editStationName" v-model="selectedStation.name" type="text" required />
      </div>
      <div class="p-field">
        <label for="editStationLatitude">Latitude:</label>
        <input
          id="editStationLatitude"
          v-model.number="selectedStation.latitude"
          type="number"
          step="any"
        />
      </div>
      <div class="p-field">
        <label for="editStationLongitude">Longitude:</label>
        <input
          id="editStationLongitude"
          v-model.number="selectedStation.longitude"
          type="number"
          step="any"
        />
      </div>
      <template #footer>
        <Button
          label="Cancel"
          icon="pi pi-times"
          class="p-button-text"
          @click="displayEditStationDialog = false"
        />
        <Button label="Save" icon="pi pi-check" @click="saveEditedStation" />
      </template>
    </Dialog>

    <!-- Delete Station Dialog -->
    <Dialog
      v-model:visible="displayDeleteStationDialog"
      header="Delete Station"
      :modal="true"
      class="p-fluid"
    >
      <div class="p-field">
        <p>
          Are you sure you want to delete station "<strong>{{
            stationToDelete.name
          }}</strong
          >"? This will also delete all connected rail lines.
        </p>
      </div>
      <template #footer>
        <Button
          label="Abort"
          icon="pi pi-times"
          class="p-button-text"
          @click="displayDeleteStationDialog = false"
        />
        <Button
          label="OK"
          icon="pi pi-check"
          class="p-button-danger"
          @click="deleteSelectedStation"
        />
      </template>
    </Dialog>

    <!-- Edit Connection Dialog -->
    <Dialog
      v-model:visible="displayEditConnectionDialog"
      header="Edit Rail Line"
      :modal="true"
      class="p-fluid"
    >
      <div class="p-field">
        <label for="editSourceNodeName">Source Station:</label>
        <Select
          id="editSourceNodeName"
          v-model="selectedConnection.newSourceNodeName"
          :options="stations"
          optionLabel="name"
          placeholder="Select a Station"
          :editable="true"
          :showClear="true"
          required
        />
      </div>
      <div class="p-field">
        <label for="editTargetNodeName">Target Station:</label>
        <Select
          id="editTargetNodeName"
          v-model="selectedConnection.newTargetNodeName"
          :options="stations"
          optionLabel="name"
          placeholder="Select a Station"
          :editable="true"
          :showClear="true"
          required
        />
      </div>
      <template #footer>
        <Button
          label="Cancel"
          icon="pi pi-times"
          class="p-button-text"
          @click="displayEditConnectionDialog = false"
        />
        <Button label="Save" icon="pi pi-check" @click="saveEditedConnection" />
      </template>
    </Dialog>

    <!-- Delete Connection Dialog -->
    <Dialog
      v-model:visible="displayDeleteConnectionDialog"
      header="Delete Rail Line"
      :modal="true"
      class="p-fluid"
    >
      <div class="p-field">
        <p>Are you sure you want to delete the rail line between:</p>
        <p>
          <strong>Source Station:</strong> {{ connectionToDelete.sourceNodeName?.name }}
        </p>
        <p>
          <strong>Target Station:</strong> {{ connectionToDelete.targetNodeName?.name }}
        </p>
      </div>
      <template #footer>
        <Button
          label="Abort"
          icon="pi pi-times"
          class="p-button-text"
          @click="displayDeleteConnectionDialog = false"
        />
        <Button
          label="OK"
          icon="pi pi-check"
          class="p-button-danger"
          @click="deleteSelectedConnection"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, reactive, toRaw, computed, onMounted, onUnmounted, watch } from "vue";
import Select from "primevue/select";
import Panel from "primevue/panel";
import Dialog from "primevue/dialog"; // Import Dialog
import Button from "primevue/button"; // Import Button

const { data, pending, error, refresh } = await useFetch("/api/data");
const stations = computed(() => data.value?.stations || []);
const relationships = computed(() => data.value?.relationships || []);

// Reactive variable for the main data management dialog
const displayManageDataDialog = ref(false);

// Reactive variables for editing station
const displayEditStationDialog = ref(false);
const selectedStation = reactive({
  originalName: "",
  name: "",
  latitude: null,
  longitude: null,
});

// Reactive variables for deleting station
const displayDeleteStationDialog = ref(false);
const stationToDelete = reactive({
  name: "",
});

// Reactive variables for editing connection
const displayEditConnectionDialog = ref(false);
const selectedConnection = reactive({
  originalSourceNodeName: "",
  originalTargetNodeName: "",
  newSourceNodeName: "",
  newTargetNodeName: "",
});

// Reactive variables for deleting connection
const displayDeleteConnectionDialog = ref(false);
const connectionToDelete = reactive({
  sourceNodeName: "",
  targetNodeName: "",
});

const newNode = reactive({
  name: "",
  city: "",
  latitude: null,
  longitude: null,
});

const newRelationship = reactive({
  sourceNodeName: "",
  relationshipType: "CONNECTS", // Hardcode relationship type for rail lines
  targetNodeName: "",
  distance: null, // Add distance property for relationships
});

let trainMarker = null;
let animationInterval = null;

const trainSimulation = reactive({
  startNodeName: null,
  endNodeName: null,
});

// Map related variables
let map = null;
let selectedMarker = null;
let LeafletInstance = null;
let railLinesLayerGroup = null; // Layer group for rail lines

onMounted(async () => {
  LeafletInstance = await import("leaflet"); // Assign imported Leaflet to LeafletInstance
  // Initialize map
  map = LeafletInstance.map("map").setView([48.2082, 16.3738], 13); // Centered on Vienna, Austria

  LeafletInstance.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  // Handle map clicks to select coordinates
  map.on("click", (e) => {
    const { lat, lng } = e.latlng;
    newNode.latitude = lat;
    newNode.longitude = lng;

    // Remove existing marker if any
    if (selectedMarker) {
      map.removeLayer(selectedMarker);
    }

    // Add new marker
    selectedMarker = LeafletInstance.marker([lat, lng])
      .addTo(map)
      .bindPopup(`Selected: ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
      .openPopup();
  });

  // Add existing station markers
  addStationMarkers(stations.value, LeafletInstance);

  // Initialize layer group for rail lines
  railLinesLayerGroup = LeafletInstance.layerGroup().addTo(map);

  // Draw initial rail lines
  drawRailLines(relationships.value, LeafletInstance);
});

onUnmounted(() => {
  if (map) {
    map.remove();
    map = null;
  }
});

watch(
  [stations, relationships], // Watch both stations and relationships
  ([newStations, newRelationships]) => {
    if (map && LeafletInstance) {
      addStationMarkers(newStations, LeafletInstance);
      drawRailLines(newRelationships, LeafletInstance);
    }
  },
  { deep: true }
);

function addStationMarkers(stationsToAdd, LeafletInstance) {
  // Clear existing station markers (if any, not including selectedMarker)
  map.eachLayer((layer) => {
    if (layer instanceof LeafletInstance.Marker && layer !== selectedMarker) {
      map.removeLayer(layer);
    }
  });

  stationsToAdd.forEach((station) => {
    if (station.latitude && station.longitude) {
      LeafletInstance.marker([station.latitude, station.longitude])
        .addTo(map)
        .bindPopup(
          `<b>${station.name}</b><br>Lat: ${station.latitude}, Lng: ${station.longitude}`
        );
    }
  });
}

function drawRailLines(relationshipsToDraw, LeafletInstance) {
  if (railLinesLayerGroup) {
    railLinesLayerGroup.clearLayers(); // Clear existing lines
  }

  relationshipsToDraw.forEach((rel) => {
    if (rel.sourceLat && rel.sourceLng && rel.targetLat && rel.targetLng) {
      const latlngs = [
        [rel.sourceLat, rel.sourceLng],
        [rel.targetLat, rel.targetLng],
      ];
      LeafletInstance.polyline(latlngs, { color: "blue", weight: 3 })
        .bindPopup(
          `Rail Line: ${rel.sourceName} to ${rel.targetName} (${rel.distance} km)`
        )
        .addTo(railLinesLayerGroup);
    }
  });
}

async function addNode() {
  try {
    await $fetch("/api/station", {
      method: "POST",
      body: {
        name: newNode.name,
        latitude: newNode.latitude,
        longitude: newNode.longitude,
      },
    });
    alert("Node added successfully!");
    // Clear form
    newNode.name = "";
    newNode.latitude = null;
    newNode.longitude = null;
    if (selectedMarker) {
      map.removeLayer(selectedMarker);
      selectedMarker = null;
    }
    refresh(); // Refresh the list of stations and update map markers
  } catch (e) {
    alert("Error adding node: " + e.message);
  }
}

async function addRelationship() {
  try {
    await $fetch("/api/connection", {
      method: "POST",
      body: {
        sourceNodeName: newRelationship.sourceNodeName.name, // Extract name from object
        relationshipType: newRelationship.relationshipType,
        targetNodeName: newRelationship.targetNodeName.name, // Extract name from object
        distance: newRelationship.distance, // Ensure distance is sent
      },
    });
    alert("Relationship created successfully!");
    // Clear form
    newRelationship.sourceNodeName = "";
    newRelationship.targetNodeName = "";
    newRelationship.distance = null;
    refresh(); // Refresh the list of nodes (to see updated graph if applicable)
  } catch (e) {
    alert("Error creating relationship: " + e.message);
  }
}

function openEditStationDialog(station) {
  selectedStation.originalName = station.name;
  selectedStation.name = station.name;
  selectedStation.latitude = station.latitude;
  selectedStation.longitude = station.longitude;
  displayEditStationDialog.value = true;
}

async function saveEditedStation() {
  try {
    await $fetch("/api/station", {
      method: "PUT",
      body: toRaw(selectedStation),
    });
    alert("Station updated successfully!");
    displayEditStationDialog.value = false;
    refresh(); // Refresh the list of stations and update map markers
  } catch (e) {
    alert("Error updating station: " + e.message);
  }
}

function confirmDeleteStation(station) {
  stationToDelete.name = station.name;
  displayDeleteStationDialog.value = true;
}

async function deleteSelectedStation() {
  try {
    await $fetch("/api/station", {
      method: "DELETE",
      body: { name: stationToDelete.name },
    });
    alert("Station deleted successfully!");
    displayDeleteStationDialog.value = false;
    refresh(); // Refresh the list of stations and update map markers
  } catch (e) {
    alert("Error deleting station: " + e.message);
  }
}

function openEditConnectionDialog(relationship) {
  selectedConnection.originalSourceNodeName = relationship.sourceName;
  selectedConnection.originalTargetNodeName = relationship.targetName;
  selectedConnection.newSourceNodeName = stations.value.find(
    (s) => s.name === relationship.sourceName
  );
  selectedConnection.newTargetNodeName = stations.value.find(
    (s) => s.name === relationship.targetName
  );
  displayEditConnectionDialog.value = true;
}

async function saveEditedConnection() {
  try {
    await $fetch("/api/connection.put", {
      method: "PUT",
      body: {
        originalSourceNodeName: selectedConnection.originalSourceNodeName,
        originalTargetNodeName: selectedConnection.originalTargetNodeName,
        newSourceNodeName: selectedConnection.newSourceNodeName.name,
        newTargetNodeName: selectedConnection.newTargetNodeName.name,
      },
    });
    alert("Connection updated successfully!");
    displayEditConnectionDialog.value = false;
    refresh(); // Refresh the list of relationships and update map lines
  } catch (e) {
    alert("Error updating connection: " + e.message);
  }
}

async function confirmDeleteConnection(relationship) {
  connectionToDelete.sourceNodeName = stations.value.find(
    (s) => s.name === relationship.sourceName
  );
  connectionToDelete.targetNodeName = stations.value.find(
    (s) => s.name === relationship.targetName
  );
  displayDeleteConnectionDialog.value = true;
}

async function deleteSelectedConnection() {
  try {
    await useFetch("/api/connection", {
      method: "DELETE",
      body: {
        sourceNodeName: connectionToDelete.sourceNodeName.name,
        targetNodeName: connectionToDelete.targetNodeName.name,
      },
    });
    alert("Connection deleted successfully!");
    displayDeleteConnectionDialog.value = false;
    refresh(); // Refresh the list of relationships and update map lines
  } catch (e) {
    alert("Error deleting connection: " + e.message);
  }
}

async function importEuropeanCities() {
  try {
    await $fetch("/api/import-european-cities", {
      method: "POST",
    });
    alert("European cities imported successfully!");
    refresh(); // Refresh the list of stations and update map markers
  } catch (e) {
    alert("Error importing European cities: " + e.message);
  }
}

async function startTrainAnimation() {
  if (
    !LeafletInstance ||
    !trainSimulation.startNodeName ||
    !trainSimulation.endNodeName
  ) {
    alert("Please select both start and end stations for the train simulation.");
    return;
  }

  // Clear any existing animation
  if (animationInterval) {
    clearInterval(animationInterval);
  }
  if (trainMarker) {
    map.removeLayer(trainMarker);
    trainMarker = null;
  }

  try {
    // Fetch the shortest path from the backend
    let path = await $fetch("/api/path", {
      method: "GET",
      query: {
        startNodeName: trainSimulation.startNodeName.name,
        endNodeName: trainSimulation.endNodeName.name,
      },
    });

    if (!path || path.length === 0) {
      alert("No path found between the selected stations.");
      return;
    }

    // Check if the path needs to be reversed for animation
    if (path[0].sourceName !== trainSimulation.startNodeName.name) {
      path = path.reverse().map((segment) => ({
        sourceName: segment.targetName,
        sourceLat: segment.targetLat,
        sourceLng: segment.targetLng,
        targetName: segment.sourceName,
        targetLat: segment.sourceLat,
        targetLng: segment.sourceLng,
        distance: segment.distance,
      }));
    }

    // Create a custom icon for the train (using a placeholder for now)
    const trainIcon = LeafletInstance.icon({
      iconUrl: "/steamengine.png", // Place steamengine.png in the nuxt-app/public directory
      shadowUrl: "/marker-shadow.png",
      iconSize: [32, 32], // Adjusted size for a train icon
      iconAnchor: [16, 32], // Adjusted anchor
      popupAnchor: [0, -20],
      shadowSize: [41, 41],
    });

    trainMarker = LeafletInstance.marker([path[0].sourceLat, path[0].sourceLng], {
      icon: trainIcon,
    }).addTo(map);

    let currentSegmentIndex = 0;
    let currentStepInSegment = 0;

    const TRAIN_SPEED_KMH = 160000; // km/h
    const ANIMATION_INTERVAL_MS = 50; // ms

    animationInterval = setInterval(() => {
      if (currentSegmentIndex < path.length) {
        const segment = path[currentSegmentIndex];
        const startPoint = LeafletInstance.latLng(segment.sourceLat, segment.sourceLng);
        const endPoint = LeafletInstance.latLng(segment.targetLat, segment.targetLng);

        // Calculate duration for this segment based on distance and speed
        const segmentDistanceKm = segment.distance;
        const segmentDurationHours = segmentDistanceKm / TRAIN_SPEED_KMH;
        const segmentDurationMs = segmentDurationHours * 3600 * 1000;

        // Calculate total steps for this segment to maintain fixed speed
        const totalStepsForSegment = Math.max(
          1,
          Math.round(segmentDurationMs / ANIMATION_INTERVAL_MS)
        );

        if (currentStepInSegment <= totalStepsForSegment) {
          const ratio = currentStepInSegment / totalStepsForSegment;
          const lat = startPoint.lat + (endPoint.lat - startPoint.lat) * ratio;
          const lng = startPoint.lng + (endPoint.lng - startPoint.lng) * ratio;
          trainMarker.setLatLng([lat, lng]);
          currentStepInSegment++;
        } else {
          currentSegmentIndex++;
          currentStepInSegment = 0;
        }
      } else {
        clearInterval(animationInterval);
        map.removeLayer(trainMarker);
        trainMarker = null;
      }
    }, ANIMATION_INTERVAL_MS);
  } catch (e) {
    alert("Error starting train animation: " + e.message);
  }
}
</script>

<style>
body {
  font-family: sans-serif;
  margin: 20px;
  background-color: #f4f4f4;
  color: #333;
}

h1 {
  color: #0056b3;
}

form div {
  margin-bottom: 10px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

input[type="text"],
input[type="number"] {
  width: calc(100% - 22px);
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  background-color: #007bff;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

button:hover {
  background-color: #0056b3;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  background-color: #e9ecef;
  margin-bottom: 10px;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.station-list-content {
  max-height: 300px; /* Set a max-height for scrollable lists within the dialog */
  overflow-y: auto; /* Enable vertical scrolling for lists within the dialog */
  border: 1px solid #ddd; /* Optional: add a border to visualize the area */
  padding: 10px;
  border-radius: 4px;
}

.main-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 20px;
}

.import-button-container {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1000; /* Ensure it's above other elements like the map */
}

/* PrimeVue grid system for dialog content */
.p-grid {
  display: flex;
  flex-wrap: wrap;
  margin-left: -1rem;
  margin-right: -1rem;
  margin-top: -1rem;
}

.p-grid > .p-col-12 {
  width: 100%;
  padding: 1rem;
}

.p-grid > .p-md-6 {
  flex: 0 0 50%;
  max-width: 50%;
}

@media screen and (max-width: 768px) {
  .p-grid > .p-md-6 {
    flex: 0 0 100%;
    max-width: 100%;
  }
}

.button-group {
  margin-left: auto;
}
</style>
