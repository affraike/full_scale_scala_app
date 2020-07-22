var host = document.location.origin.toString();
var req = new XMLHttpRequest();
var url = new URL(host + '/api/acumen');
var CsrfToken = document.cookie.substring(11);
var gettingAcumenAnswers = null;
var framedString = '';
var isFrame = false;

function  handleMessage(messageData) {
  try {
    var obj = JSON.parse(messageData);
    if (!Array.isArray(obj)) {
      switch (obj.event) {
        case "firstRes":
          console.log("send jsReady");
          req.open('POST', url, true);
          req.setRequestHeader("Csrf-Token", CsrfToken);
          req.send("[" + JSON.stringify(jsReady) + "]\r");
          req.onload = function(e) {
            console.log(this.responseText);
          };
          break;
        case "longMessage":
          console.log("the data has been splitted into " + obj.size + " chunks");
          break;
        case "state":
          if (obj.state === "appReady") {
            editor.setOptions({
                readOnly: false
            })
            document.getElementById("undoAction").disabled = true;   // Hack to disable button cause of init code.
            var loader = document.getElementById("loader");
            setTimeout(function () {
              loader.style.display = 'none';
            }, 1000);
            loader.style.WebkitTransition = 'opacity 1s';
            loader.style.opacity = '0';
          }
          else if (obj.state === "appExit"){
            document.getElementById("loader").style.display = "none";
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
          editor.setValue(obj.text.replace(/@quote@/g, '"'), 1);
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
            var parText = document.createTextNode(obj.data[1].replace(/@quote@/g, '"'));
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
                    req.open('POST', url, true);
                    req.setRequestHeader("Csrf-Token", CsrfToken);
                    req.send("[" + JSON.stringify(setSemantics(tempID)) + "]\r");
                    req.onload = function(e) {
                      console.log(this.responseText);
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
                  req.open('POST', url, true);
                  req.setRequestHeader("Csrf-Token", CsrfToken);
                  req.send("[" + JSON.stringify(contractionAction) + "]\r");
                  req.onload = function(e) {
                    console.log(this.responseText);
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
              var textnode = document.createTextNode(obj[1][i][j].replace(/@quote@/g, '"'));
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
}

var editor = null;

/** Prompts and Dialogs */
var confirmContinue = new function () {
  this.show = function (type) {
    var scButton = document.getElementById('saveAndContinue');
    var dcButton = document.getElementById('discardAndContinue');
    var cButton = document.getElementById('cancelAndGoBack');
    switch (type) {
      case 'save':
        scButton.setAttribute("onClick", "javascript: getResponse('save', 'newAction');");
        dcButton.setAttribute("onClick", "javascript: getResponse('discard', 'newAction');");
        cButton.setAttribute("onClick", "javascript: getResponse('cancel', 'newAction');");
        break;
      case 'open':
        scButton.setAttribute("onClick", "javascript: getResponse('save', 'openAction');");
        dcButton.setAttribute("onClick", "javascript: getResponse('discard', 'openAction');");
        cButton.setAttribute("onClick", "javascript: getResponse('cancel', 'openAction');");
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
      req.open('POST', url, true);
      req.setRequestHeader("Csrf-Token", CsrfToken);
      req.send("[" + JSON.stringify(saveFile(false)) + "]\r");
      req.onload = function(e) {
        console.log(this.responseText);
      };
      if (type === 'newAction') {
        req.open('POST', url, true);
        req.send("[" + JSON.stringify(newAction) + "]\r");
        req.onload = function(e) {
          console.log(this.responseText);
        }; 
      }
      else if (type === 'openAction') {
        req.open('POST', url, true);
        req.setRequestHeader("Csrf-Token", CsrfToken);
        req.send("[" + JSON.stringify(openAction) + "]\r");
        req.onload = function(e) {
          console.log(this.responseText);
        }; 
      }
      editedSinceLastSave = false;
      editor.focus();
      break;
    case 'discard':
      if (type === 'newAction') { 
        req.open('POST', url, true);
        req.setRequestHeader("Csrf-Token", CsrfToken);
        req.send("[" + JSON.stringify(newAction) + "]\r");
        req.onload = function(e) {
          console.log(this.responseText);
        }; 
      }
      else if (type === 'openAction') { 
        req.open('POST', url, true);
        req.setRequestHeader("Csrf-Token", CsrfToken);
        req.send("[" + JSON.stringify(openAction) + "]\r");
        req.onload = function(e) {
          console.log(this.responseText);
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
  document.getElementById("launchToggle").onclick = function() {
    document.getElementById("loader").style.display = "flex";

    if (this.checked){
      req.open('POST', host + '/api/init', true);
      req.setRequestHeader("Csrf-Token", CsrfToken);
      req.send();
      req.onload = function(e) {
        console.log(this.responseText);
        gettingAcumenAnswers = setInterval(() => {
          req.open('GET', host  + '/api/buffer', true);
          req.setRequestHeader("Csrf-Token", CsrfToken);
          req.send();
          req.onload = function(event) {
            var msg = this.responseText.substring(1, this.responseText.length-1);

            if (isFrame == true) {
              if (msg.substring(msg.length - 5) === '[END]') {
                framedString += msg.substring(0, msg.length - 5);
                framedString = framedString.replace(/\\\\\\\"/g, "@quote@");
                framedString = framedString.replace(/\\"/g, '"');
                framedString = framedString.replace(/\\n/g, '\n');
                //console.log('final message F: ', framedString)
                handleMessage(framedString);
                framedString = '';
                isFrame = false;
              }
              else {
                framedString += msg;
              }
            }else{
              if (msg == 'Buffer is empty'){}
              else if (msg.substring(0, 10) === '[PROGRESS]') {
                msg = msg.replace(/\\"/g, '"');
                msg = msg.replace(/\\n/g, '\n');
                var regex = /\[PROGRESS\](.*?)\[\/PROGRESS\]/g;
                var n = msg.match(regex);
                var m = regex.exec(n);
                //console.log('final message P: ', m[1])
                handleMessage(m[1]);
              }
              else if (msg.substring(0, 7) === '[FRAME]'){
                framedString = msg.substring(7);
                isFrame = true;
              }
              else {
                //console.log('final message #: ', msg)
                msg = msg.replace(/\\\\\\"/g, "@quote@");
                msg = msg.replace(/\\"/g, '"');
                msg = msg.replace(/\\\\n/g, '\\n');
                handleMessage(msg);
              }
            }
          };
        }, 333);
      };
    }
    else{
      clearInterval(gettingAcumenAnswers);
      req.open('POST', url, true);
      req.setRequestHeader("Csrf-Token", CsrfToken);
      req.send("[" + JSON.stringify(exitAction) + "]\r");
    }
    
  }
  populateFontMenu();
  populateThemeMenu();
  document.getElementById("newAction").onclick = function () {
    if (editedSinceLastSave) { confirmContinue.show('save'); }
    else {
      req.open('POST', url, true);
      req.setRequestHeader("Csrf-Token", CsrfToken);
      req.send("[" + JSON.stringify(newAction) + "]\r");
      req.onload = function(e) {
        console.log(this.responseText);
      };
      editor.focus();
    }
  };
  document.getElementById("openAction").onclick = function () {
    if (editedSinceLastSave) { confirmContinue.show('open'); }
    else {
      req.open('POST', url, true);
      req.setRequestHeader("Csrf-Token", CsrfToken);
      req.send("[" + JSON.stringify(openAction) + "]\r");
      req.onload = function(e) {
        console.log(this.responseText);
      };
      editor.focus();
    }
  };
  document.getElementById("saveAction").onclick = function () {
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(saveFile(true)) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("saveAsAction").onclick = function () {
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(saveFileAs(true)) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("recoverAction").onclick = function () {
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(recoverAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("downloadAction").onclick = function() {
    var filename = document.getElementById("fileNameLabelText").innerHTML;
    if (!filename.includes('.acm')) {
      filename = filename + '.acm'
    }
    var data = editor.session.getValue();
    var blob = new Blob([data], {type: 'text/csv'});
    if(window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveBlob(blob, filename);
    }else{
      var elem = window.document.createElement('a');
      elem.href = window.URL.createObjectURL(blob);
      elem.download = filename;        
      document.body.appendChild(elem);
      elem.click();        
      document.body.removeChild(elem);
    }
  
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
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(simulatorFieldsAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("childCount").onclick = function () {
    if (this.checked == true) { childCountAction.value = 'true'; }
    else { childCountAction.value = 'false'; }
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(childCountAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("rngSeeds").onclick = function () {
    if (this.checked == true) { rngSeedsAction.value = 'true'; }
    else { rngSeedsAction.value = 'false'; }
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(rngSeedsAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("normalization").onclick = function () {
    if (this.checked == true) { normalizationAction.value = 'true'; }
    else { normalizationAction.value = 'false'; }
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(normalizationAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("startServer").onclick = function () {
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(startServerAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("stopServer").onclick = function () {
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(stopServerAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("resetDevice").onclick = function () {
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(resetDeviceAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("serverLink").onclick = function () {
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(resetDeviceAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("playButton").onclick = function () {
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(playAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    }
  };
  document.getElementById("pauseButton").onclick = function () {
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(pauseAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("stepButton").onclick = function () {
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(stepAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("stopButton").onclick = function () {
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(stopAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("playMenuButton").onclick = function () {
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(playAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    }
  };
  document.getElementById("pauseMenuButton").onclick = function () {
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(pauseAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("stepMenuButton").onclick = function () {
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(stepAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("stopMenuButton").onclick = function () {
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(stopAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("consoleButton").onclick = function () {
    changeCTab('consoleTab', event);
  };
  document.getElementById("browserButton").onclick = function () {
    changeCTab('browserTab', event);
  };
  document.getElementById("dragAndDropButton").onclick = function () {
    changeCTab('dropTab', event);
  };
  document.getElementById("dropTab").ondragover = function (ev) {
    ev.preventDefault();
  };
  document.getElementById("dropTab").ondrop = function (ev) {
    ev.preventDefault();
    ev.dataTransfer.files[0].text().then(text => {
      document.getElementById("fileNameLabelText").innerHTML = ev.dataTransfer.files[0].name.toString()
      editor.focus();
      editor.selectAll();
      editor.setValue(text);
    });
  };
  document.getElementById("plotButton").onclick = function () {
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(plotButton) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
    changeRTab('plotTab', event);
  };
  document.getElementById("traceButton").onclick = function () {
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(traceButton) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
    changeRTab('traceTab', event);
  };
  document.getElementById("threeDButton").onclick = function () {
    req.open('POST', url, true);
    req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(threeDButton) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
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
  req.open('POST', url, true);
  req.setRequestHeader("Csrf-Token", CsrfToken);
  req.send("[" + JSON.stringify(getCode()) + "]\r");
  req.onload = function(e) {
    console.log(this.responseText);
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
          req.open('POST', url, true);
          req.setRequestHeader("Csrf-Token", CsrfToken);
          req.send("[" + JSON.stringify(selectFile(fileNodeC.id.substring(4))) + "]\r") 
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

var jsReady = {
  type: 'event',
  event: 'jsReady'
}

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
