/* resonance/js/polyfills.js */

// Polyfills
if(!Object.values)Object.values=function(o){return Object.keys(o).map(function(k){return o[k];});};
if(!Object.assign)Object.assign=function(t){for(var i=1;i<arguments.length;i++){var s=arguments[i];for(var k in s){if(Object.prototype.hasOwnProperty.call(s,k))t[k]=s[k];}}return t;};
if(!Array.prototype.find)Array.prototype.find=function(fn){for(var i=0;i<this.length;i++){if(fn(this[i],i,this))return this[i];}};
if(!Array.prototype.findIndex)Array.prototype.findIndex=function(fn){for(var i=0;i<this.length;i++){if(fn(this[i],i,this))return i;}return -1;};
