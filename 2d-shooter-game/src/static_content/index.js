import React from 'react';
import ReactDOM from 'react-dom';

import {LoginPage} from 'components';

console.log('before render!');
ReactDOM.render( <LoginPage />, document.getElementById("root"));
console.log('after render!');