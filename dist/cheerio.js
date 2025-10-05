export function isTagElement(element) {
    return (typeof element === "object" &&
        element !== null &&
        "type" in element &&
        element.type === "tag");
}
