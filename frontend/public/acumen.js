const acumenProgress = new EventSource("http://localhost:9080")
const toAcumen = new EventSource("http://localhost:9090")
var req = new XMLHttpRequest();
var url = new URL('http://localhost:8080/api/acumen');

var CsrfToken = "9db1ee8c7716e13f728fb41204468758c921f2de-1593444589631-8234a413427e4b696e6d1873"

toAcumen.onopen = (event) => {
  url.searchParams.set('str', "[{\"type\": \"event\", \"event\": \"jsReady\"}]\r");
  req.open('POST', url, true);
  req.setRequestHeader("Csrf-Token", CsrfToken);
  req.send();
  req.onload = function(e) {
    console.log(e.data);
  };
}

var framedString = '';
var isFrame = false;
toAcumen.onmessage =  (event) => {
  if (event.data.substring(0, 7) === '[FRAME]') {
    framedString = event.data.substring(7);
    isFrame = true;
  }
  else {
    if (isFrame == true) {
      if (event.data.substring(event.data.length - 5) === '[END]') {
        framedString += event.data.substring(0, event.data.length - 5);
        handleMessage(framedString);
        framedString = '';
        isFrame = false;
      }
      else {
        framedString += event.data;
      }
    }
    else {
      handleMessage(event.data);
    }
  }
};

toAcumen.onerror = function(err) { 
  console.log(err);
}

acumenProgress.onmessage = (event) => {
  if (event.data.substring(0, 10) === '[PROGRESS]') {
    var regex = /\[PROGRESS\](.*?)\[\/PROGRESS\]/g;
    var n = event.data.match(regex);
    var m = regex.exec(n);
    handleMessage(m[1]);
  }
  else {
    console.log('Wrong progress data!');
  }
};

acumenProgress.onerror = function(err) {
  console.log(err);
};

function  handleMessage(messageData) {
  try {
    var obj = JSON.parse(messageData);
    if (!Array.isArray(obj)) {
      switch (obj.event) {
        case "state":
          if (obj.state === "appReady") {
            editor.session.getUndoManager().reset();
            document.getElementById("undoAction").disabled = true;   // Hack to disable button cause of init code.
            var loader = document.getElementById("loader");
            setTimeout(function () {
              loader.style.display = 'none';
            }, 1000);
            loader.style.WebkitTransition = 'opacity 1s';
            loader.style.opacity = '0';
          }
          else {
            stateChanged(obj.state);
          }
          break;
        case "enableNormalize":
          document.getElementById("normalization").checked = true;
          break;
        case "viewChange":
          switch (obj.selectView) {
            case "plotView":
              changeRTab('plotTab');
              document.getElementById("plotButton").className += " active";
              break;
            case "threedView":
              changeRTab('threeDtab');
              document.getElementById("threeDButton").className += " active";
              break;
          }
          break;
        case "codeArea":
          editor.setValue(obj.text, 1);
          editedSinceLastSave = false;
          break;
        case "console":
          if (obj.data[0] === 'separator') {
            var toggler = document.getElementsByClassName("consoleItem");
            for (var i = 0; i < toggler.length; i++) {
              for (var child = toggler[i].firstChild; child !== null; child = child.nextSibling) {
                child.style.color = "grey";
              }
            }
          }
          else {
            var node = document.createElement("li");
            node.className = 'consoleItem';
            node.addEventListener("click", function () {
              let logger = document.getElementById("consoleAreaList");
              for (var child = logger.firstChild; child !== null; child = child.nextSibling) {
                child.style.backgroundColor = 'white';
              }
              this.style.backgroundColor = 'lightgrey';
            });
            if (obj.data[0] === 'status' && obj.data[3]) {
              let logger = document.getElementById("consoleAreaList");
              logger.removeChild(logger.lastChild);
            }
            if (obj.data[0] === 'error') {
              var type = document.createElement("a");
              type.style.color = 'red';
              type.style.paddingBottom = '5px';
              var bold = document.createElement('strong');
              var parText = document.createTextNode('ERROR:');
              bold.appendChild(parText);
              type.appendChild(bold);
              node.appendChild(type);
              editor.gotoLine(parseInt(obj.data[2].split(".")[0]), parseInt(obj.data[2].split(".")[1]) - 1);
              changeCTab('consoleTab');
              document.getElementById("consoleButton").className += " active";
            }
            var par = document.createElement("a");
            var parText = document.createTextNode(obj.data[1]);
            par.appendChild(parText);
            node.appendChild(par);
            document.getElementById("consoleAreaList").appendChild(node);
          }
          break;
        case "progress":
          document.getElementById("progressBar").value = obj.data;
          break;
        case "setFilename":
          document.getElementById("fileNameLabelText").innerHTML = obj.data;
          break;
        case "serverStarted":
          document.getElementById("startServer").disabled = true;
          document.getElementById("stopServer").disabled = false;
          document.getElementById("resetDevice").disabled = false;
          document.getElementById("serverLink").disabled = false;
          document.getElementById("serverLink").innerText = 'Open server link: ' + obj.link;
          document.getElementById("serverLink").onclick = function () { window.open("http://" + obj.link); };
          break;
        case "serverStopped":
          document.getElementById("startServer").disabled = false;
          document.getElementById("stopServer").disabled = true;
          document.getElementById("resetDevice").disabled = true;
          document.getElementById("serverLink").disabled = true;
          document.getElementById("serverLink").innerText = 'Server Link';
          break;
      }
    }
    else {
      if (obj[0].hasOwnProperty('action')) {
        if (obj[0].action === 'filetree') {
          showBrowser(obj[1]);
        }
        else if (obj[0].action === 'threedAllFrames') {
          // TODO This is the json object containing all the frames.
          let complete3Dframes = obj;
          /** ---------- How to enable the 3D Tab ----------
           * In order for the 3DTab to work you need to follow these steps:
           * - Enable the canvas in acumen.html file
           * - Import both the babylon library and your custom babylon js file
           * - Send from this js file to babylon's through a method. For example: load3Ddataset(obj);
           *
           * ---------- How the dataset is constructed ----------
           * Each frame contains the objects, which are represented as followed:
           * 1. type:
           *    - newObj   (for new objects)
           *    - tranform (for transformations of existing objects)
           * 2. data:
           *    - id
           *    - name
           *    - path
           *    - angle
           *    - position
           *    - color
           *    - coordinates
           *    - position
           *    - size
           *    - text
           *    - transparency
           *    - height
           *
           * The last object of the json file is the camera options, which are represented as followed:
           * 1. type: "camera"
           * 2. position
           * 3. lookAtPosition
          */
        }
        else if (obj[0].action === 'populateSemantics') {
          for (i = 1; i < obj.length; i++) {
            var group;
            if (obj[i].hasOwnProperty('traditional')) { group = document.getElementById("traditionalSemantics"); }
            else if (obj[i].hasOwnProperty('enclosure')) { group = document.getElementById("enclosureSemantics"); }
            else { group = document.getElementById("deprecatedSemantics"); }
            for (var j in obj[i]) {
              for (var k in obj[i][j]) {
                if (obj[i][j][k].id !== "separator") {
                  let listItem = document.createElement("li");
                  let label = document.createElement("label");
                  let input = document.createElement("input");
                  input.setAttribute('type', "radio");
                  input.setAttribute('name', 'semantics');
                  let tempID = obj[i][j][k].id;
                  let isEnclosure = obj[i][j][k].isEnclosure;
                  input.onclick = function () {
                    url.searchParams.set('str', "[" + JSON.stringify(setSemantics(tempID)) + "]\r");
                    req.open('POST', url, true);
                    req.setRequestHeader("Csrf-Token", CsrfToken);
                    req.send();
                    req.onload = function(e) {
                      console.log(e.data);
                    };
                    if (isEnclosure) { toggleContraction(true); }
                    else { toggleContraction(false); }
                  }
                  if (obj[i][j][k].selected) input.checked = true;
                  let textnode = document.createTextNode(obj[i][j][k].name);
                  label.appendChild(input);
                  label.appendChild(textnode);
                  listItem.appendChild(label);
                  group.appendChild(listItem);
                  enabledWhenStopped.push(input);
                  enabledWhenStopped.push(label);
                }
                else {
                  group.appendChild(document.createElement("hr"));
                }
              }
              if (obj[i].hasOwnProperty('enclosure')) {
                let contrLabel = document.createElement("label");
                let contrInput = document.createElement("input");
                contrInput.setAttribute('type', "checkbox");
                contrInput.setAttribute('id', 'contraction');
                contrInput.disabled = true;
                contrInput.onclick = function () {
                  if (this.checked == true) { contractionAction.value = 'true'; }
                  else { contractionAction.value = 'false'; }
                  url.searchParams.set('str', "[" + JSON.stringify(contractionAction) + "]\r");
                  req.open('POST', url, true);
                  req.setRequestHeader("Csrf-Token", CsrfToken);
                  req.send();
                  req.onload = function(e) {
                    console.log(e.data);
                  };
                };
                let contrSpan = document.createElement("span");
                contrSpan.innerHTML = 'Contraction';
                contrLabel.appendChild(contrInput);
                contrLabel.appendChild(contrSpan);
                group.appendChild(document.createElement("hr"));
                group.appendChild(contrLabel);
                enabledWhenStopped.push(contrLabel);
              }
            }
          }
        }
      }
      else if (obj[0].hasOwnProperty('event')) {
        if (obj[0].event === "traceTable") {
          var table = document.getElementById("traceTable");
          while (table.hasChildNodes()) {
            table.removeChild(table.firstChild);
          }
          for (i = 0; i < obj[1].length; i++) {
            var rowNode = document.createElement("TR");
            for (var j in obj[1][i]) {
              var columnNode;
              if (i == 0) columnNode = document.createElement("TH");
              else columnNode = document.createElement("TD");
              var textnode = document.createTextNode(obj[1][i][j]);
              columnNode.appendChild(textnode);
              rowNode.appendChild(columnNode);
            }
            table.appendChild(rowNode);
          }
        }
        else if (obj[0].event === "plotter") {
          var plotCharts = new Array();
          switch (obj[0].type) {
            case "doubles":
              for (i = 1; i < obj.length; i++) {
                plotCharts.push(new Array());
                for (var j in obj[i].data) {
                  plotCharts[plotCharts.length - 1].push({ x: obj[i].data[j].x, y: obj[i].data[j].y });
                }
              }
              var xArray = [];
              var yArray = [];
              var data = [];
              var temp = 1;                            //FIXME Possible bug in Plot.ly!
              for (var i in plotCharts) {
                for (var j in plotCharts[i]) {
                  xArray.push(plotCharts[i][j].x);
                  yArray.push(plotCharts[i][j].y);
                }
                var trace = {
                  x: xArray,
                  y: yArray,
                  xaxis: 'x' + temp,
                  yaxis: 'y' + temp,
                  name: obj[temp].title,
                  type: 'scatter',
                  mode: 'lines'
                };
                data.push(trace);
                xArray = [];
                yArray = [];
                temp += 1;
              }
              var layout = {
                grid: { rows: data.length, columns: 1, pattern: 'independent' },
              };
              Plotly.newPlot(document.getElementById("plotTab"), data, layout, {responsive: true});
              break;
            case "discrete":
              console.log("Not yet implemented");
              break;
            case "enclosure":
              var plotTitles = [];
              for (i = 1; i < obj.length; i++) {
                plotTitles.push(obj[i].title);
                for (var j in obj[i].data) {
                  plotCharts.push(new Array());
                  for (var k in obj[i].data[j]) {
                    plotCharts[plotCharts.length - 1].push({ x: obj[i].data[j][k].x, y: obj[i].data[j][k].y });
                  }
                }
              }
              console.log(plotCharts[3].length);
              var xArray = [];
              var yArray = [];
              var data = [];
              var temp = 1;                            // FIXME Possible bug in Plot.ly!
              for (var i in plotCharts) {
                for (var j in plotCharts[i]) {
                  xArray.push(plotCharts[i][j].x);
                  yArray.push(plotCharts[i][j].y);
                }
                var trace = {};
                if (i % 2 == 0) {                      // FIXME check input
                  if (i >= 1) temp += 1;
                  trace = {
                    x: xArray,
                    y: yArray,
                    xaxis: 'x' + temp,
                    yaxis: 'y' + temp,
                    name: plotTitles[temp - 1],
                    type: 'scatter',
                  };
                }
                else {
                  trace = {
                    x: xArray,
                    y: yArray,
                    xaxis: 'x' + temp,
                    yaxis: 'y' + temp,
                    name: plotTitles[temp - 1],
                    fill: 'tonexty',
                    type: 'scatter'
                  };
                }
                data.push(trace);
                xArray = [];
                yArray = [];
              }
              var layout = {
                grid: { rows: data.length / 2, columns: 1, pattern: 'independent' },
              };
              Plotly.newPlot(document.getElementById("plotTab"), data, layout, {responsive: true});
              break;
          }
        }
      }
    }
  }
  catch (error) {
    // FIXME Sometime when data are sent in a small period of time, sockets do not intercept different messages.
    // var split = event.data.split(/\r/g);
    console.error(error + "\nData was: " + messageData);
  }
}

/** Action when user closes the browser window */
window.onbeforeunload = function () {
  if (editedSinceLastSave) return "You have unsaved data. Please check before closing the window.";
  url.searchParams.set('str', "[" + JSON.stringify(exitAction) + "]\r");
  req.open('POST', url, true);
  req.setRequestHeader("Csrf-Token", CsrfToken);
  req.send();
  req.onload = function(e) {
    console.log(e.data);
  };
}

var editor = null;

/** Prompts and Dialogs */
var confirmContinue = new function () {
  this.show = function (type) {
    var scButton = document.getElementById('saveAndContinue');
    var dcButton = document.getElementById('discardAndContinue');
    switch (type) {
      case 'save':
        scButton.setAttribute("onClick", "javascript: getResponse('save', 'newAction');");
        dcButton.setAttribute("onClick", "javascript: getResponse('discard', 'newAction');");
        break;
      case 'open':
        scButton.setAttribute("onClick", "javascript: getResponse('save', 'openAction');");
        dcButton.setAttribute("onClick", "javascript: getResponse('discard', 'openAction');");
        break;
    }
    document.getElementById('promptPanel').style.display = '';
  }
  this.close = function () {
    document.getElementById('promptPanel').style.display = 'none';
  }
}

function getResponse(res, type) {
  switch (res) {
    case 'save':
      url.searchParams.set('str', "[" + JSON.stringify(saveFile(false)) + "]\r");
      req.open('POST', url, true);
      req.setRequestHeader("Csrf-Token", CsrfToken);
      req.send();
      req.onload = function(e) {
        console.log(e.data);
      };
      if (type === 'newAction') {
        url.searchParams.set('str', "[" + JSON.stringify(newAction) + "]\r");
        req.open('POST', url, true);
        req.send();
        req.onload = function(e) {
          console.log(e.data);
        }; 
      }
      else if (type === 'openAction') {
        url.searchParams.set('str', "[" + JSON.stringify(openAction) + "]\r");
        req.open('POST', url, true);
        req.setRequestHeader("Csrf-Token", CsrfToken);
        req.send();
        req.onload = function(e) {
          console.log(e.data);
        }; 
      }
      editedSinceLastSave = false;
      editor.focus();
      break;
    case 'discard':
      if (type === 'newAction') { 
        url.searchParams.set('str', "[" + JSON.stringify(newAction) + "]\r");
        req.open('POST', url, true);
        req.setRequestHeader("Csrf-Token", CsrfToken);
        req.send();
        req.onload = function(e) {
          console.log(e.data);
        }; 
      }
      else if (type === 'openAction') { 
        url.searchParams.set('str', "[" + JSON.stringify(openAction) + "]\r");
        req.open('POST', url, true);
        req.setRequestHeader("Csrf-Token", CsrfToken);
        req.send();
        req.onload = function(e) {
          console.log(e.data);
        }; 
      }
      editedSinceLastSave = false;
      editor.focus();
      break;
    case 'cancel':
      confirmContinue.close();
      return false;
  }
  confirmContinue.close();
}

/** Assign values after browser finished loading the page */
window.onload = function () {
  populateFontMenu();
  populateThemeMenu();
  document.getElementById("newAction").onclick = function () {
    if (editedSinceLastSave) { confirmContinue.show('save'); }
    else {
      url.searchParams.set('str', "[" + JSON.stringify(newAction) + "]\r");
      req.open('POST', url, true);
      req.setRequestHeader("Csrf-Token", CsrfToken);
      req.send();
      req.onload = function(e) {
        console.log(e.data);
      };
      editor.focus();
    }
  };
  document.getElementById("openAction").onclick = function () {
    if (editedSinceLastSave) { confirmContinue.show('open'); }
    else {
      url.searchParams.set('str', "[" + JSON.stringify(openAction) + "]\r");
      req.open('POST', url, true);
      req.setRequestHeader("Csrf-Token", CsrfToken);
      req.send();
      req.onload = function(e) {
        console.log(e.data);
      };
      editor.focus();
    }
  };
  document.getElementById("saveAction").onclick = function () {
    url.searchParams.set('str', "[" + JSON.stringify(saveFile(true)) + "]\r");
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send();
    req.onload = function(e) {
      console.log(e.data);
    };
  };
  document.getElementById("saveAsAction").onclick = function () {
    url.searchParams.set('str', "[" + JSON.stringify(saveFileAs(true)) + "]\r");
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send();
    req.onload = function(e) {
      console.log(e.data);
    };
  };
  document.getElementById("recoverAction").onclick = function () {
    url.searchParams.set('str', "[" + JSON.stringify(recoverAction) + "]\r");
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send();
    req.onload = function(e) {
      console.log(e.data);
    };
  };
  document.getElementById("exportAction").setAttribute("onClick", "javascript: exportTable();");
  document.getElementById("undoAction").onclick = function () {
    editor.undo();
  };
  document.getElementById("redoAction").onclick = function () {
    editor.redo();
  };
  document.getElementById("cutAction").onclick = function () {
    editor.focus();
    document.execCommand('cut');
  };
  document.getElementById("copyAction").onclick = function () {
    editor.focus();
    document.execCommand('copy');
  };
  document.getElementById("pasteAction").onclick = function () {
    editor.focus();
    document.execCommand('paste');
  };
  document.getElementById("showFind").onclick = function () {
    if (this.checked == true) {
      if (editor.search == undefined) { editor.execCommand("find"); } else { editor.searchBox.show(); }
    }
    else { editor.searchBox.hide(); }
  };
  document.getElementById("incIndentAction").onclick = function () {
    editor.indent();
  };
  document.getElementById("decIndentAction").onclick = function () {
    editor.blockOutdent();
  };
  document.getElementById("selectAllAction").onclick = function () {
    editor.selectAll();
  };
  document.getElementById("increaseFontSize").onclick = function () {
    changeFontSize(document.getElementById("editor"), 2);
  };
  document.getElementById("resetFontSize").onclick = function () {
    document.getElementById("editor").style.fontSize = '12px';
  };
  document.getElementById("reduceFontSize").onclick = function () {
    changeFontSize(document.getElementById("editor"), (-2));
  };
  document.getElementById("lineNumbers").onclick = function () {
    if (this.checked == true) { editor.renderer.setShowGutter(true); }
    else { editor.renderer.setShowGutter(false); }
  };
  document.getElementById("simulatorFields").onclick = function () {
    if (this.checked == true) { simulatorFieldsAction.value = 'true'; }
    else { simulatorFieldsAction.value = 'false'; }
    url.searchParams.set('str', "[" + JSON.stringify(simulatorFieldsAction) + "]\r");
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send();
    req.onload = function(e) {
      console.log(e.data);
    };
  };
  document.getElementById("childCount").onclick = function () {
    if (this.checked == true) { childCountAction.value = 'true'; }
    else { childCountAction.value = 'false'; }
    url.searchParams.set('str', "[" + JSON.stringify(childCountAction) + "]\r");
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send();
    req.onload = function(e) {
      console.log(e.data);
    };
  };
  document.getElementById("rngSeeds").onclick = function () {
    if (this.checked == true) { rngSeedsAction.value = 'true'; }
    else { rngSeedsAction.value = 'false'; }
    url.searchParams.set('str', "[" + JSON.stringify(rngSeedsAction) + "]\r");
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send();
    req.onload = function(e) {
      console.log(e.data);
    };
  };
  document.getElementById("normalization").onclick = function () {
    if (this.checked == true) { normalizationAction.value = 'true'; }
    else { normalizationAction.value = 'false'; }
    url.searchParams.set('str', "[" + JSON.stringify(normalizationAction) + "]\r");
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send();
    req.onload = function(e) {
      console.log(e.data);
    };
  };
  document.getElementById("startServer").onclick = function () {
    url.searchParams.set('str', "[" + JSON.stringify(startServerAction) + "]\r");
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send();
    req.onload = function(e) {
      console.log(e.data);
    };
  };
  document.getElementById("stopServer").onclick = function () {
    url.searchParams.set('str', "[" + JSON.stringify(stopServerAction) + "]\r");
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send();
    req.onload = function(e) {
      console.log(e.data);
    };
  };
  document.getElementById("resetDevice").onclick = function () {
    url.searchParams.set('str', "[" + JSON.stringify(resetDeviceAction) + "]\r");
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send();
    req.onload = function(e) {
      console.log(e.data);
    };
  };
  document.getElementById("serverLink").onclick = function () {
    url.searchParams.set('str', "[" + JSON.stringify(resetDeviceAction) + "]\r");
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send();
    req.onload = function(e) {
      console.log(e.data);
    };
  };
  document.getElementById("playButton").onclick = function () {
    url.searchParams.set('str', "[" + JSON.stringify(playAction) + "]\r");
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send();
    req.onload = function(e) {
      console.log(e.data);
    }
  };
  document.getElementById("pauseButton").onclick = function () {
    url.searchParams.set('str', "[" + JSON.stringify(pauseAction) + "]\r");
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send();
    req.onload = function(e) {
      console.log(e.data);
    };
  };
  document.getElementById("stepButton").onclick = function () {
    url.searchParams.set('str', "[" + JSON.stringify(stepAction) + "]\r");
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send();
    req.onload = function(e) {
      console.log(e.data);
    };
  };
  document.getElementById("stopButton").onclick = function () {
    url.searchParams.set('str', "[" + JSON.stringify(stopAction) + "]\r");
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send();
    req.onload = function(e) {
      console.log(e.data);
    };
  };
  document.getElementById("consoleButton").onclick = function () {
    changeCTab('consoleTab', event);
  };
  document.getElementById("browserButton").onclick = function () {
    changeCTab('browserTab', event);
  };
  document.getElementById("plotButton").onclick = function () {
    url.searchParams.set('str', "[" + JSON.stringify(plotButton) + "]\r");
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send();
    req.onload = function(e) {
      console.log(e.data);
    };
    changeRTab('plotTab', event);
  };
  document.getElementById("traceButton").onclick = function () {
    url.searchParams.set('str', "[" + JSON.stringify(traceButton) + "]\r");
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send();
    req.onload = function(e) {
      console.log(e.data);
    };
    changeRTab('traceTab', event);
  };
  document.getElementById("threeDButton").onclick = function () {
    url.searchParams.set('str', "[" + JSON.stringify(threeDButton) + "]\r");
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send();
    req.onload = function(e) {
      console.log(e.data);
    };
    changeRTab('threeDtab', event);
  };
  document.getElementById("editor").addEventListener('input', function () {
    if (!editedSinceLastSave) {
      editedSinceLastSave = true;
      document.getElementById("fileNameLabelText").innerHTML += " (unsaved)";
    }
  });
  enabledWhenStopped = [
    document.getElementById("newAction"),
    document.getElementById("openAction"),
    document.getElementById("exportAction"),
    document.getElementById("recoverAction")
  ];
  editor = ace.edit("editor");
  editor.setTheme("ace/theme/dreamweaver");
  editor.session.setMode("ace/mode/acumen");
  editor.setOption('cursorStyle', 'smooth');
  editor.session.setOptions({ tabSize: 2, useSoftTabs: true });
  editor.on("input", updateInput);
}

/** Helper Functions */
function populateFontMenu() {
  let fonts = ["Monaco", "Menlo", "Ubuntu Mono", "Monospace"];
  menuNode = document.getElementById("fontMenu");
  editorNode = document.getElementById("editor");
  for (i in fonts) {
    let node = document.createElement("li");
    let label = document.createElement("label");
    let input = document.createElement("input");
    let text = document.createTextNode(fonts[i]);
    input.setAttribute('type', "radio");
    input.setAttribute('name', 'font');
    input.onclick = function () { editorNode.style.fontFamily = fonts[i]; }
    if (i == 0) { input.checked = true; }
    label.appendChild(input);
    label.appendChild(text);
    node.appendChild(label);
    menuNode.appendChild(node);
  }
}

function populateThemeMenu() {
  let themes = ["dreamweaver", "textMate", "ambiance", "dracula"];
  menuNode = document.getElementById("themeMenu");
  for (i in themes) {
    let node = document.createElement("li");
    let label = document.createElement("label");
    let input = document.createElement("input");
    let text = document.createTextNode(themes[i]);
    input.setAttribute('type', "radio");
    input.setAttribute('name', 'theme');
    input.onclick = function () { editor.setTheme("ace/theme/" + themes[i]); }
    if (i == 0) { input.checked = true; }
    label.appendChild(input);
    label.appendChild(text);
    node.appendChild(label);
    menuNode.appendChild(node);
  }
}

function updateInput() {
  document.getElementById("undoAction").disabled = !editor.session.getUndoManager().hasUndo();
  document.getElementById("redoAction").disabled = !editor.session.getUndoManager().hasRedo();
  url.searchParams.set('str', "[" + JSON.stringify(getCode()) + "]\r");
  req.open('POST', url, true);
  req.setRequestHeader("Csrf-Token", CsrfToken);
  req.send();
  req.onload = function(e) {
    console.log(e.data);
  };
}

function changeFontSize(node, value) {
  style = window.getComputedStyle(node, null).getPropertyValue('font-size');
  currentSize = parseFloat(style);
  node.style.fontSize = (currentSize + value) + 'px';
}

function toggleContraction(value) {
  if (value) {
    document.getElementById("contraction").disabled = false;
  }
  else {
    document.getElementById("contraction").disabled = true;
  }
}

function stateChanged(state) {
  if (state === "Starting") {
    var table = document.getElementById("traceTable");
    while (table.hasChildNodes()) {
      table.removeChild(table.firstChild);
    }
  }
  if (state === "Stopped") {
    document.getElementById("stopButton").disabled = true;
    document.getElementById("stopMenuButton").disabled = true;
    editor.setReadOnly(false);
    for (var i in enabledWhenStopped) {
      if (enabledWhenStopped[i].tagName === 'BUTTON' || enabledWhenStopped[i].tagName === 'INPUT') {
        enabledWhenStopped[i].disabled = false;
      }
      else {
        enabledWhenStopped[i].style.color = 'white';
        enabledWhenStopped[i].style.cursor = 'auto'
      }
    }
  }
  else {
    document.getElementById("stopButton").disabled = false;
    document.getElementById("stopMenuButton").disabled = false;
    editor.setReadOnly(true);
    for (var i in enabledWhenStopped) {
      if (enabledWhenStopped[i].tagName === 'BUTTON' || enabledWhenStopped[i].tagName === 'INPUT') {
        enabledWhenStopped[i].disabled = true;
      }
      else {
        enabledWhenStopped[i].style.color = 'grey';
        enabledWhenStopped[i].style.cursor = 'not-allowed'
      }
    }
  }
  if (state === "Stopped" || state === "Paused") {
    document.getElementById("stepButton").disabled = false;
    document.getElementById("stepMenuButton").disabled = false;
  }
  else {
    document.getElementById("stepButton").disabled = true;
    document.getElementById("stepMenuButton").disabled = true;

  }
  switch (state) {
    case "Starting": case "Resuming":                                         // Simulates class 'Playing'
      document.getElementById("playButton").style.display = 'none';
      document.getElementById("playMenuButton").style.display = 'none';
      document.getElementById("pauseButton").style.display = '';
      document.getElementById("pauseMenuButton").style.display = '';
      break;
    case "Stopped": case "Paused":                                            // Simulates class 'Ready'
      document.getElementById("playButton").style.display = '';
      document.getElementById("playMenuButton").style.display = '';
      document.getElementById("pauseButton").style.display = 'none';
      document.getElementById("pauseMenuButton").style.display = 'none';
      break;
  }
}

function exportTable() {
  var html = document.getElementById("traceTable");
  var csv = [];
  var rows = document.querySelectorAll("table tr");

  for (var i = 0; i < rows.length; i++) {
    var row = [], cols = rows[i].querySelectorAll("td, th");

    for (var j = 0; j < cols.length; j++)
      row.push(cols[j].innerText);

    csv.push(row.join(","));
  }

  // Download CSV
  download_csv(csv.join("\n"), 'table.csv');
}

function download_csv(csv, filename) {
  var csvFile;
  var downloadLink;
  csvFile = new Blob([csv], { type: "text/csv" });
  downloadLink = document.createElement("a");
  downloadLink.download = filename;
  downloadLink.href = window.URL.createObjectURL(csvFile);
  downloadLink.style.display = "none";
  document.body.appendChild(downloadLink);
  downloadLink.click();
}

function showBrowser(file) {
  if (file.hasOwnProperty('children') && file.children.length > 0) {
    for (i = 0; i < file.children.length; i++) {
      let folderNode = document.createElement("li");
      let span = document.createElement('span');
      span.innerHTML = file.children[i].name;
      span.className = 'caret';
      folderNode.appendChild(span);
      let nestedNode = document.createElement("ul");
      nestedNode.className = 'nestedNode';
      folderNode.appendChild(nestedNode);
      createChildNodes(file.children[i], nestedNode)
      document.getElementById("browserAreaList").appendChild(folderNode);
    }
  }

  // Show/Hide folders
  var toggler = document.getElementsByClassName("caret");
  var i;
  for (i = 0; i < toggler.length; i++) {
    toggler[i].addEventListener("click", function () {
      this.parentElement.querySelector(".nestedNode").classList.toggle("active");
      this.classList.toggle("caret-down");
    });
  }
}

function createChildNodes(file, parentNode) {
  if (file.hasOwnProperty('children') && file.children.length > 0) {
    for (let j = 0; j < file.children.length; j++) {
      if (file.children[j].hasOwnProperty('children')) {
        let folderNodeC = document.createElement("li");
        let spanC = document.createElement('span');
        spanC.innerHTML = file.children[j].name;
        spanC.className = 'caret';
        folderNodeC.appendChild(spanC);
        let nestedNodeC = document.createElement("ul");
        nestedNodeC.className = 'nestedNode';
        if (file.children[j].children.length > 0) {
          createChildNodes(file.children[j], nestedNodeC);
        }
        folderNodeC.appendChild(nestedNodeC);
        parentNode.appendChild(folderNodeC);
      }
      else {
        let fileNodeC = document.createElement("li");
        fileNodeC.id = '[ID]' + file.children[j].id;
        fileNodeC.addEventListener("click", function () { 
          url.searchParams.set('str', "[" + JSON.stringify(selectFile(fileNodeC.id.substring(4))) + "]\r");
          req.open('POST', url, true);
          req.setRequestHeader("Csrf-Token", CsrfToken);
          req.send() 
        });
        let textC = document.createTextNode(file.children[j].name);
        fileNodeC.style.cursor = "pointer";
        fileNodeC.appendChild(textC);
        parentNode.appendChild(fileNodeC);
      }
    }
  }
  else {
    let fileNode = document.createElement("li");
    fileNode.id = '[ID]' + file.id;
    fileNode.addEventListener("click", function () { console.log(fileNode.id) });
    let text = document.createTextNode(file.name);
    fileNode.appendChild(text);
  }
}

/** Json and miscallenious objects */
var enabledWhenStopped = [];
var editedSinceLastSave = false;

var newAction = {
  type: 'action',
  action: 'newFile'
}

var openAction = {
  type: 'action',
  action: 'openFile'
}

function selectFile(fileID) {
  var file = {
    type: 'action',
    action: 'SelectFile',
    file: parseInt(fileID)
  }
  return file;
}

function saveFile(updateCurrentFile) {
  var saveAction = {
    type: 'action',
    action: 'saveFile',
    updateCurrent: updateCurrentFile
  }
  return saveAction;
}

function saveFileAs(updateCurrentFile) {
  var saveAction = {
    type: 'action',
    action: 'saveFileAs',
    updateCurrent: updateCurrentFile
  }
  return saveAction;
}

var recoverAction = {
  type: 'action',
  action: 'recover'
}

var simulatorFieldsAction = {
  type: 'action',
  action: 'simulatorFields',
  value: ''
}

var childCountAction = {
  type: 'action',
  action: 'childCount',
  value: ''
}

var contractionAction = {
  type: 'action',
  action: 'contraction',
  value: ''
}

var rngSeedsAction = {
  type: 'action',
  action: 'rngSeeds',
  value: ''
}

var normalizationAction = {
  type: 'action',
  action: 'normalization',
  value: ''
}

function getCode() {
  var codeUpdate = {
    type: 'codeUpdate',
    text: editor.getValue()
  }
  return codeUpdate;
}

function setSemantics(semanticsID) {
  var semanticsAction = {
    type: 'action',
    action: 'setSemantics',
    semantics: semanticsID
  }
  return semanticsAction;
}

var startServerAction = {
  type: 'action',
  action: 'startServer'
}

var stopServerAction = {
  type: 'action',
  action: 'stopServer'
}

var resetDeviceAction = {
  type: 'action',
  action: 'resetDevice'
}

var playAction = {
  type: 'action',
  action: 'Play'
}

var pauseAction = {
  type: 'action',
  action: 'Pause'
}

var stepAction = {
  type: 'action',
  action: 'Step'
}

var stopAction = {
  type: 'action',
  action: 'Stop'
}

var exitAction = {
  type: 'action',
  action: 'Exit'
}

var plotButton = {
  type: 'btnAction',
  action: 'plotTab'
}

var traceButton = {
  type: 'btnAction',
  action: 'traceTab'
}

var threeDButton = {
  type: 'btnAction',
  action: 'threeDtab'
}

/** Other Functions */
function changeRTab(tabName, evt) {
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("vtabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("vtablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  document.getElementById(tabName).style.display = "flex";
  if (evt !== undefined) { evt.currentTarget.className += " active"; }
}

function changeCTab(tabName, evt) {
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("ctabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("ctablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  document.getElementById(tabName).style.display = "block";
  if (evt !== undefined) { evt.currentTarget.className += " active"; }
}
