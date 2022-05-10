<template>
Demo
<div id="app">

</div>
</template>
<script>
import AudioWorkService from "./mixins/service/AudioWorkService.js"

var service = new AudioWorkService({
    debugLog: false
});

service.loadFromUrl("../../demo_16000_16.wav")
    .onEncoded((encoded) => {
        console.log(encoded.blobUrl);
        //open(encoded.blobUrl);
        service.destroy();
    })
    .extract(0, 2.5);

export default {
    name: "App",
    components: {},
};
</script>

<style>
#app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
    margin-top: 60px;
}
</style>
