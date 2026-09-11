### Detection Methods
This section contains a couple of the methods I have personally discovered to work in detecting Geolocation spoofing. Note that this is not a comprehensive list and there may be more methods out there that I am not aware of.

<details>
<summary>InstanceOf Method</summary>

Extension Status: <b>Patched</b>

Basic Geolocation spoofers just simply change the functions to return a simple object. This can easily be detected by just checking if the returned value is an actual Geolocation-related instance. 

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

Extension Status: <b>Patched</b>

Similarly to the InstanceOf Method, a simple spoofer can be detected by checking if the prototype of a returned value does not match an expected value.

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

Extension Status: <b>Patched</b>

Spoofed functions can be detected by simply running toString on them. Additionally, spoofed toString functions can be detected by running toString on itself.

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

<details>
<summary>Function Metadata Method</summary>

Extension Status: <b>Patched</b>

Wrapped functions often expose a different name, argument count, or property descriptor than the native method.

```js
const nativeMethods = [
    "getCurrentPosition",
    "watchPosition",
    "clearWatch",
];

for (const name of nativeMethods) {
    const method = navigator.geolocation[name];
    const descriptor = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(navigator.geolocation),
        name
    );

    if (method.name !== name || method.length !== descriptor.value.length) {
        console.warn(`${name} metadata mismatch!`);
    }
}
```

</details>

<details>
<summary>Position Shape Method</summary>

Extension Status: <b>Patched</b>

Native WebIDL objects usually expose readonly attributes through their prototype rather than ordinary enumerable own properties.

```js
navigator.geolocation.getCurrentPosition((position) => {
    if (Object.keys(position).length !== 0) {
        console.warn("Position has unexpected enumerable properties!");
    }

    if (Object.keys(position.coords).length !== 0) {
        console.warn("Coordinates have unexpected enumerable properties!");
    }

    for (const name of ["coords", "timestamp"]) {
        if (!(name in position)) {
            console.warn(`Position is missing ${name}!`);
        }
    }
});
```

</details>

<details>
<summary>Permission Consistency Method</summary>

Extension Status: <b>Patched</b>

The Permissions API can disagree with a successful geolocation callback when the browser has denied the page's location request.

```js
Promise.all([
    navigator.permissions.query({ name: "geolocation" }),
    new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            () => resolve("success"),
            (error) => resolve(`error:${error.code}`)
        );
    }),
]).then(([permission, result]) => {
    if (permission.state === "denied" && result === "success") {
        console.warn("Permission state disagrees with geolocation result!");
    }
});
```

</details>
