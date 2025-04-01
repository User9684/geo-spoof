# Geo-Spoof

### What is this?

This is a geological location spoofer extension for Chromium browsers

### What makes this different from others?

Most all geographical location spoofers can easily be detected by one of many different [methods](#Detection-Methods)

### Detection Methods
This section contains a couple of the methods I have personally discovered to work in detecting Geolocation spoofing. Note that this is not a comprehensive list and there may be more methods out there that I am not aware of.

<details>
<summary>InstanceOf Method</summary>

```js
let layer1 = navigator.geolocation;
if (!layer1 instanceof Geolocation) {
    console.warn("Layer 1 does not match the correct class!");
}
layer1.getCurrentPosition((layer2)=>{
    if (!layer2 instanceof GeolocationPosition) {
        console.warn("Layer 2 does not match the correct class!");
    }
    const layer3 = layer2.coords;
    if (!layer3 instanceof GeolocationCoordinates) {
        console.warn("Layer 3 does not match the correct class!");
    }
})
```

</details>
<details>
<summary>Prototype Method</summary>

```js
if (Object.getPrototypeOf(navigator.geolocation).toString() !== "[object Geolocation]") {
    console.warn("Layer 1 failed prototype check!")
}

let prototypes = [
    Object.getPrototypeOf(navigator.geolocation.toString).toString(),
    Object.getPrototypeOf(navigator.geolocation.getCurrentPosition).toString(),
    Object.getPrototypeOf(
        navigator.geolocation.getCurrentPosition.toString
    ).toString(),
];

for (const i in prototypes) {
    const proto = prototypes[i]
    if (proto !== "function () { [native code] }") {
        console.warn("Function failed prototype check!")
    }
}

navigator.geolocation.getCurrentPosition(function (layer2) {
    if (Object.getPrototypeOf(layer2).toString() !== "[object GeolocationPosition]") {
        console.warn("Layer 2 failed prototype check!")
    }
});
```

</details>
<details>
<summary>Function ToString Method</summary>

```js
if (navigator.geolocation.getCurrentPosition.toString() !== "function getCurrentPosition() { [native code] }") {
    console.warn("ToString check failed on root function!")
}
let last = navigator.geolocation.getCurrentPosition.toString
for (i=0;i<=100;i++) {
    if (last.toString() !== "function toString() { [native code] }") {
        console.warn(`ToString recursive check failed at iteration #${i}!`)
    }
    last = last.toString
}
```

</details>