/**
 * Convert string to correct data type. Usually convert element.value (string) in integer, float, boolean or JSON.
 * @param {string} val
 * @param {(msg: string) => void} [onError] - optional error handler for bad object/array literals
 * @returns {string | number | boolean | object | undefined | null}
 */
export default function stringTypeConvert(val, onError) {
  const isJSON = str => {
    try { JSON.parse(str); }
    catch (err) { return false; }
    return true;
  };

  const toObject = str => {
    try { return JSON.parse(str); }
    catch (err) {
      if (onError) { onError(`stringTypeConvert Error: Bad Object or array definition in "${str}"`); }
    }
  };

  if (val === 'undefined') { // convert string into undefined
    val = undefined;
  } else if (val === 'null') { // convert string into null
    val = null;
  } else if (val === 'true' || val === 'false') { // convert string into boolean (true/false)
    val = JSON.parse(val);
  } else if (typeof val === 'string' && /^\d+$/.test(val)) { // decimal integer only (12), not 0x… hex
    val = parseInt(val, 10);
  } else if (typeof val === 'string' && /^\d+\.\d+$/.test(val)) { // decimal float only (12.35)
    val = parseFloat(val);
  } else if (isJSON(val)) { // convert JSON string {"a": "Lorem ipsum"} into object
    val = toObject(val);
  } else if (typeof val === 'string' && /^\s*({.*}|\[.*\])\s*$/.test(val)) { // convert object or array notation {a: 'Lorem ipsum'} or ['str', 88] into object
    const jsonStr = val.replace(/'/g, '"').replace(/(\w+):/g, '"$1":'); // {color: 'red'} -> {"color": "red"}
    val = toObject(jsonStr);
  }

  return val;
}
