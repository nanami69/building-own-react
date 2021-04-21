import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const element = {
  type: "h1",
  props: {
    title: "foo",
    children: "Hello",
  },
};

const node = document.createElement(element.type);
node["title"] = element.props.title;
const text = document.createTextNode("");
text["nodeValue"] = element.props.children;

const container = document.getElementById("root");
node.appendChild(text);
if ( container ) {
  container.appendChild(node);
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
