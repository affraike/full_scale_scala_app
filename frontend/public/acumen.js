var host = document.location.origin.toString();
var req = new XMLHttpRequest();
var buffer = new XMLHttpRequest();
var url = new URL(host + '/api/acumen');
var CsrfToken = null;
var editor = null;
var gettingAcumenAnswers = null;
var framedString = '';
var isFrame = false;
var engine = null;
var obj = null;

function  handleMessage(messageData) {
  try {
    obj = JSON.parse(messageData);
  }
  catch(error) {
    var framedString = '';
    var isFrame = false;
    if (messageData.includes('threedAllFrames')){
      document.getElementById('threeDTabError').style.display = "block";
    } 
    else if (messageData.includes('traceTable')) {
      document.getElementById('traceTabError').style.display = "block";
    }
    else if (messageData.includes('plotter')) {
      document.getElementById('plotTabError').style.display = "block";
    }
    console.log('Failed to parse JSON data.\nError: ' + error + '\nData: ' + messageData);

    return;
  }
  if (!Array.isArray(obj)) {
    switch (obj.event) {
      case "firstRes":
        try {
          console.log("send jsReady");
          req.open('POST', url, true);
          //req.setRequestHeader("Csrf-Token", CsrfToken);
          req.send("[" + JSON.stringify(jsReady) + "]\r");
          req.onload = function(e) {
            console.log(this.responseText);
          };
        }
        catch(error) {
          console.log('An error occured during initialisation, please reboot server. \n Error: ' + error)
        }
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
          console.log("Exiting the app");
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
        try {
          editor.setValue(obj.text.replace(/@quote@/g, '"'), 1);
          editedSinceLastSave = false;
        }
        catch(error) {
          console.log('An error occured while loading text on the editor, please try again.\n Error: ' + error);
        }
        break;
      case "console":
        try {
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
        }
        catch(error) {
          console.log('Failed to load console message.\n Error: ' + error);
        }
        break;
      case "progress":
        try {
          document.getElementById("progressBar").value = obj.data;
        }
        catch(error) {
          console.log('Failed to update progress bar.\n Error: ' + error);
        }
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
        try {
          document.getElementById('browserError').style.display = "none";
          showBrowser(sortByKey(obj[1]));
        }
        catch {
          document.getElementById('browserError').style.display = "block";
        }
        if (!document.getElementById('browserAreaList').hasChildNodes()) {
          document.getElementById('browserError').style.display = "block";
        }
      }
      else if (obj[0].action === 'threedAllFrames') {
        // TODO This is the json object containing all the frames.
        try {
          document.getElementById('threeDTabError').style.display = "none";
          let complete3Dframes = obj;
          load3Ddataset(obj);
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
        catch {
          document.getElementById('threeDTabError').style.display = "block";
        }
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
                  //req.setRequestHeader("Csrf-Token", CsrfToken);
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
                //req.setRequestHeader("Csrf-Token", CsrfToken);
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
        try {
          document.getElementById('traceTabError').style.display = "none";
          var table = document.getElementById("traceTable");
          while (table.hasChildNodes()) {
            table.removeChild(table.firstChild);
          }
          for (i = 0; i < obj[1].length; i++) {
            var rowNode = document.createElement("TR");
            for (var j in obj[1][i]) {
              var columnNode;
              if (i == 0) {
                columnNode = document.createElement("TH");
                var textnode = document.createTextNode(obj[1][i][j].replace(/@quote@/g, '"').split(/\)./)[1]);
              }
              else {
                columnNode = document.createElement("TD");
                var textnode = document.createTextNode(obj[1][i][j].replace(/@quote@/g, '"'));
              }
              columnNode.appendChild(textnode);
              rowNode.appendChild(columnNode);
            }
            table.appendChild(rowNode);
          }
        }
        catch {
          var table = document.getElementById("traceTable");
          while (table.hasChildNodes()) {
            table.removeChild(table.firstChild);
          }
          document.getElementById('traceTabError').style.display = "block";
        }
      }
      else if (obj[0].event === "plotter") {
        try {
          document.getElementById('plotTabError').style.display = "none";
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
                  name: obj[temp].title.split(/\)./)[1],
                  type: 'scatter',
                  mode: 'lines',
                  line: {
                    color: 'rgb(255, 0, 0)'
                  },
                  showlegend: true
                };
                data.push(trace);
                xArray = [];
                yArray = [];
                temp += 1;
              }
              var layout = {
                grid: { rows: 1, columns: 1, pattern: 'independent'},
              };
              for (let i=0; i < data.length; i++){
                let node = document.createElement("div");
                node.id = "chart" + i;
                document.getElementById("plotChart").appendChild(node);
                Plotly.newPlot(node, [data[i]], layout, {responsive: true});
              }
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
                    name: plotTitles[temp - 1].split(/\)./)[1],
                    type: 'scatter',
                    line: {
                      color: 'rgb(255, 0, 0)'
                    },
                    showlegend: true
                  };
                }
                else {
                  trace = {
                    x: xArray,
                    y: yArray,
                    xaxis: 'x' + temp,
                    yaxis: 'y' + temp,
                    name: plotTitles[temp - 1].split(/\)./)[1],
                    fill: 'tonexty',
                    type: 'scatter',
                    line: {
                      color: 'rgb(255, 0, 0)'
                    },
                    showlegend: true
                  };
                }
                data.push(trace);
                xArray = [];
                yArray = [];
              }
              var layout = {
                grid: { rows: 1, columns: 1, pattern: 'independent' },
              };
              for (let i=0; i < data.length; i+2){
                let node = document.createElement("div");
                node.id = "chart" + i;
                node.style.display = 'flex';
                let enclosureData = [data[i], data[i+1]]
                document.getElementById("plotChart").appendChild(node);
                Plotly.newPlot(node, enclosureData, layout, {responsive: true});
              }
              break;
          }
        }
        catch {
          document.getElementById('plotTabError').style.display = "block";
        }
      }
    }
  }
}

/** Action when user closes the browser window */
window.onbeforeunload = async function () {
  req.open('POST', url, true);
  //req.setRequestHeader("Csrf-Token", CsrfToken);
  req.send("[" + JSON.stringify(exitAction) + "]\r");
  await resetScene();
  await clearTimeout(gettingAcumenAnswers);
  // We always ask for confirmation before closing to close Acumen safely.
  return "You have unsaved data. Please check before closing the window.";
}

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
      //req.setRequestHeader("Csrf-Token", CsrfToken);
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
        //req.setRequestHeader("Csrf-Token", CsrfToken);
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
        //req.setRequestHeader("Csrf-Token", CsrfToken);
        req.send("[" + JSON.stringify(newAction) + "]\r");
        req.onload = function(e) {
          console.log(this.responseText);
        }; 
      }
      else if (type === 'openAction') { 
        req.open('POST', url, true);
        //req.setRequestHeader("Csrf-Token", CsrfToken);
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
  CsrfToken = document.cookie.substring(11);
  populateFontMenu();
  populateThemeMenu();
  document.getElementById("newAction").onclick = function () {
    if (editedSinceLastSave) { confirmContinue.show('save'); }
    else {
      req.open('POST', url, true);
      //req.setRequestHeader("Csrf-Token", CsrfToken);
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
      //req.setRequestHeader("Csrf-Token", CsrfToken);
      req.send("[" + JSON.stringify(openAction) + "]\r");
      req.onload = function(e) {
        console.log(this.responseText);
      };
      editor.focus();
    }
  };
  document.getElementById("saveAction").onclick = function () {
    req.open('POST', url, true);
    //req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(saveFile(true)) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("saveAsAction").onclick = function () {
    req.open('POST', url, true);
    //req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(saveFileAs(true)) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("recoverAction").onclick = function () {
    req.open('POST', url, true);
    //req.setRequestHeader("Csrf-Token", CsrfToken);
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
    //req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(simulatorFieldsAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("childCount").onclick = function () {
    if (this.checked == true) { childCountAction.value = 'true'; }
    else { childCountAction.value = 'false'; }
    req.open('POST', url, true);
    //req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(childCountAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("rngSeeds").onclick = function () {
    if (this.checked == true) { rngSeedsAction.value = 'true'; }
    else { rngSeedsAction.value = 'false'; }
    req.open('POST', url, true);
    //req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(rngSeedsAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("normalization").onclick = function () {
    if (this.checked == true) { normalizationAction.value = 'true'; }
    else { normalizationAction.value = 'false'; }
    req.open('POST', url, true);
    //req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(normalizationAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("startServer").onclick = function () {
    req.open('POST', url, true);
    //req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(startServerAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("stopServer").onclick = function () {
    req.open('POST', url, true);
    //req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(stopServerAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("resetDevice").onclick = function () {
    req.open('POST', url, true);
    //req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(resetDeviceAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("serverLink").onclick = function () {
    req.open('POST', url, true);
    //req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(resetDeviceAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("playButton").onclick = function () {
    req.open('POST', url, true);
    //req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(playAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    }
  };
  document.getElementById("pauseButton").onclick = function () {
    req.open('POST', url, true);
    //req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(pauseAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("stepButton").onclick = function () {
    req.open('POST', url, true);
    //req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(stepAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("stopButton").onclick = function () {
    req.open('POST', url, true);
    //req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(stopAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("playMenuButton").onclick = function () {
    req.open('POST', url, true);
    //req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(playAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    }
  };
  document.getElementById("pauseMenuButton").onclick = function () {
    req.open('POST', url, true);
    //req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(pauseAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("stepMenuButton").onclick = function () {
    req.open('POST', url, true);
    //req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(stepAction) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
  };
  document.getElementById("stopMenuButton").onclick = function () {
    req.open('POST', url, true);
    //req.setRequestHeader("Csrf-Token", CsrfToken);
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
    if (!document.getElementById('browserAreaList').hasChildNodes()) {
      document.getElementById('browserError').style.display = "block";
    } else {
      document.getElementById('browserError').style.display = "none";
    }
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
    document.getElementById('plotTabError').style.display = "none";
    req.open('POST', url, true);
    //req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(plotButton) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
    changeRTab('plotTab', event);
  };
  document.getElementById("traceButton").onclick = function () {
    document.getElementById('traceTabError').style.display = "none";
    req.open('POST', url, true);
    //req.setRequestHeader("Csrf-Token", CsrfToken);
    req.send("[" + JSON.stringify(traceButton) + "]\r");
    req.onload = function(e) {
      console.log(this.responseText);
    };
    changeRTab('traceTab', event);
  };
  document.getElementById("threeDButton").onclick = function () {
    document.getElementById('threeDTabError').style.display = "none";
    req.open('POST', url, true);
    //req.setRequestHeader("Csrf-Token", CsrfToken);
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
  document.getElementById("editor").style.fontSize = '12px';
  document.getElementById("editor").style.fontFamily = 'Lucida Console';

  //BabylonJS related elements
  startAnimationButton = document.getElementById('BabPlay');
  startAnimationButton.onclick = playAnimation;
  // startAnimationButton.disabled = true;
  stopAnimationButton = document.getElementById('BabStop');
  stopAnimationButton.onclick = function () {
    pauseAnimation();
    frame = 0;
  };
  // stopAnimationButton.disabled = true;
  timelineSlider = document.getElementById('threedProgress');
  timelineSlider.oninput = timelineAnimation;
  timelineSlider.disabled = true;
  time = document.getElementById('threedTimer');
  //Default View
  let xyzBtn = document.getElementById('defaultViewIcon');
  xyzBtn.onclick = function () {
    camera.setPosition(defaultCameraPosition);
    camera.setTarget(new BABYLON.Vector3.Zero);
  };
  //Top view
  let xyBtn = document.getElementById('topViewIcon');
  xyBtn.onclick = function () {
    var target = camera.getTarget();
    camera.setPosition(new BABYLON.Vector3(target.x.toFixed(2), parseFloat(target.y + 10).toFixed(2), parseFloat(target.z - 0.1).toFixed(2)));
  };
  //Right view
  let yzBtn = document.getElementById('rightViewIcon');
  yzBtn.onclick = function () {
    var target = camera.getTarget();
    camera.setPosition(new BABYLON.Vector3(parseFloat(target.x + 10).toFixed(2), target.y.toFixed(2), target.z.toFixed(2)));
  };
  //Front view
  let xzBtn = document.getElementById('frontViewIcon');
  xzBtn.onclick = function () {
    var target = camera.getTarget();
    camera.setPosition(new BABYLON.Vector3(target.x.toFixed(2), target.y.toFixed(2), parseFloat(target.z - 10).toFixed(2)));
  };
  //Faster Animation
  let faster = document.getElementById('fasterIcon');
  faster.onclick = function () {
    frameRate++;
  };
  //Slower Animation
  let slower = document.getElementById('slowerIcon');
  slower.onclick = function () {
    frameRate--;
  };

  // showing and setting camera position in real time
  document.getElementById("camX").onchange = moveCamera;
  document.getElementById("camY").onchange = moveCamera;
  document.getElementById("camZ").onchange = moveCamera;
  // showing and setting camera's target position in real time
  document.getElementById("laX").onchange = moveTargetCamera;
  document.getElementById("laY").onchange = moveTargetCamera;
  document.getElementById("laZ").onchange = moveTargetCamera;

  document.getElementById("showAxis").onclick = function() {
    if (document.getElementById("showAxis").checked == true) {
      showAxis(5);
    } else {
      obj3d.forEach(obj => {
        if (obj.id.toString().includes("showAxis")) {
          obj.dispose();
        }
      });
    }
  }

  InitializeBabylonJSScene();

  // After loading all elements, we launch Acumen
  req.open('POST', host + '/api/init', true);
  //req.setRequestHeader("Csrf-Token", CsrfToken);
  req.send();
  req.onload = function(e) {
    console.log(this.responseText);
    if (this.status == 503) {
      document.getElementById('loader').style.display = "none"
      document.getElementById('error').style.display = "flex"
    } else {
      loopBuffer();
    }
  }
}

/** =================================  START BABYLONJS CANVAS  ======================================== */

//BabylonJS related global variables
var canvas, engine, scene, camera, light, timelineSlider, time, timelineDelta, startAnimationButton, stopAnimationButton;
var defaultCameraPosition = new BABYLON.Vector3.Zero;
var frameRate = 1;
var framelength = 0;
var alldata = null;
var obj3d = [];
var frame = 0;
var enableAnimation = false;
/** BabylonJS Scene
 * 
*/
function InitializeBabylonJSScene() {
  canvas = document.getElementById('acumenRenderCanvas');
  engine = new window.BABYLON.Engine(canvas, true);
  scene = new BABYLON.Scene(engine);
  // Enable Collisions
  // scene.collisionsEnabled = true;
  createCamera_Light();
  //Update loop for rendering on each frame...
  //each frme of Babylon against each frame of Acumen exported Json
  scene.registerBeforeRender(function () {
    if (enableAnimation && alldata && (frame < (framelength - 1))) {
      frame++; //we start from 1st index
      if (frame >= (framelength - 1)) {
        //last frame
        frame = 0;
        pauseAnimation();
      } else {
        renderFrames();
        timelineDelta = frame;
        timelineSlider.value = frame;
        time.innerHTML = "Time: " + roundUp(frame / 60, 2) + " sec";
      }
    }
  });

  scene.registerAfterRender(function() {
    updateCameraTracking();
    updateCameraTargetTracking();
  });

  scene.clearColor = new BABYLON.Color4(192, 192, 192, 0);
  // register a render loop that repeatedly
  // renders the scene onto the canvas element
  engine.runRenderLoop(function () {
    scene.render();
  });
  //instantiate a handler for canvas/window resize events
  window.addEventListener('resize', function () {
    engineReferesh();
  });
}

//Data from Acumen Swing Buffer
function load3Ddataset(obj) {
  engineReferesh();
  resetScene();
  alldata = obj;//accumen data
  frame = 0;
  framelength = alldata.length - 1;
  startAnimationButton.disabled = false;
  timeLineSetting();
  enableAnimation = true;//starting simulation...
}

function playAnimation() {
  // startAnimationButton.style.backgroundImage = pauseButtonImage;
  // startAnimationButton.onclick = pauseAnimation;
  enableAnimation = true;
  // stopAnimationButton.disabled = false;
  if (frame >= (framelength - 1)) {
    //restart from first frame
    frame = 0;
  }
}

function pauseAnimation() {
  enableAnimation = false;
}

/**
 * BabylonJS Scene: Camera and lighting
 */
function createCamera_Light() {
  camera = new BABYLON.ArcRotateCamera("Camera", 0, 0, 5, new BABYLON.Vector3(0, 0, 0), scene);
  // Default positions & rotation of the camera
  camera.setPosition(new BABYLON.Vector3(0.00, 0.00, 0.00)); // Does not seem to have any effect
  camera.setTarget(new BABYLON.Vector3(0.00, 0.00, 0.00)); // Does not seem to have any effect
  camera.lowerRadiusLimit = 1;
  camera.upperRadiusLimit = 100;
  camera.radius = 5;
  // This attaches the camera to the canvas
  camera.attachControl(canvas, true);
  //Light direction is directly down
  var light = new BABYLON.HemisphericLight("HemiLight", new BABYLON.Vector3(0, 5, 0), scene);
  light.diffuse = new BABYLON.Color3.White();
  light.specular = new BABYLON.Color3(0, 0, 0);
  light.intensity = 0.5;
}

function moveCamera() {
  var xvalue = document.getElementById("camX").value;
  var yvalue = document.getElementById("camY").value;
  var zvalue = document.getElementById("camZ").value;
  var x = (xvalue == "") ? 0.00 : parseInt(xvalue);
  var y = (yvalue == "") ? 0.00 : parseInt(yvalue);
  var z = (zvalue == "") ? 0.00 : parseInt(zvalue);

  if (x != camera.position.x || y != camera.position.y || z != camera.position.z){
    // we apply the transformation (see renderObject)
    camera.setPosition(new BABYLON.Vector3(x, z, y));
  }
}

function updateCameraTracking() {
  var inputx = document.getElementById("camX");
  var inputy = document.getElementById("camY");
  var inputz = document.getElementById("camZ");
  
  if (inputx !== document.activeElement && inputy !== document.activeElement && inputz !== document.activeElement) {
    var xvalue = inputx.value;
    var yvalue = inputy.value;
    var zvalue = inputz.value;
    var x = (xvalue == "") ? 0.00 : parseInt(xvalue);
    var y = (yvalue == "") ? 0.00 : parseInt(yvalue);
    var z = (zvalue == "") ? 0.00 : parseInt(zvalue);

    if (x.toFixed(2) != camera.position.x.toFixed(2) || y.toFixed(2) != camera.position.z.toFixed(2) || z.toFixed(2) != camera.position.y.toFixed(2)){
      inputx.value = camera.position.x.toFixed(2);
      inputy.value = camera.position.z.toFixed(2);
      inputz.value = camera.position.y.toFixed(2);
    }
  }
}

function moveTargetCamera() {
  var xvalue = document.getElementById("laX").value;
  var yvalue = document.getElementById("laY").value;
  var zvalue = document.getElementById("laZ").value;
  var x = (xvalue == "") ? 0.00 : parseInt(xvalue);
  var y = (yvalue == "") ? 0.00 : parseInt(yvalue);
  var z = (zvalue == "") ? 0.00 : parseInt(zvalue);
  // we apply the transformation (see renderObject)
  camera.setTarget(new BABYLON.Vector3(x, z, y));
}

function updateCameraTargetTracking() {
  var inputx = document.getElementById("laX");
  var inputy = document.getElementById("laY");
  var inputz = document.getElementById("laZ");
  
  if (inputx !== document.activeElement && inputy !== document.activeElement && inputz !== document.activeElement) {
    var xvalue = inputx.value;
    var yvalue = inputy.value;
    var zvalue = inputz.value;
    var x = (xvalue == "") ? 0.00 : parseInt(xvalue);
    var y = (yvalue == "") ? 0.00 : parseInt(yvalue);
    var z = (zvalue == "") ? 0.00 : parseInt(zvalue);
    var target = camera.getTarget();

    if (x.toFixed(2) != target.x.toFixed(2) || y.toFixed(2) != target.z.toFixed(2) || z.toFixed(2) != target.y.toFixed(2)){
      inputx.value = target.x.toFixed(2);
      inputy.value = target.z.toFixed(2);
      inputz.value = target.y.toFixed(2);
    }
  }
}

/** Refresh BabylonJs Engine */
function engineReferesh() {
  engine.resize();
  if (scene) {
    scene.render();
  }
}

/**
   * Dispose older meshes. Empty previous arrays
   */
function resetScene() {
  if (alldata != null) {
    obj3d.forEach(obj => {
      if (obj.name == "Custom3D"){
        obj[0].dispose();
      } else {
      obj.dispose();
      }
    });
    obj3d = [];
    alldata = null;

  }
}

function timeLineSetting() {
  timelineSlider.max = "" + framelength;
  timelineDelta = 0;
  timelineSlider.value = 0;
  timelineSlider.disabled = false;
}

function timelineAnimation() {
  var tl_index = parseInt(timelineSlider.value);
  timelineDelta = tl_index - 1;
  frame = Math.min(Math.max(tl_index, 0), (alldata.length - 1));  //minimum zero..maximum length - 1
  time.innerHTML = "Time: " + roundUp(tl_index / 60, 2) + " sec";
  renderFrames();
  if (frame >= (framelength - 1)) {
    pauseAnimation();
  }
}

/**
* Round up a float value
* @param {*} value : float value to round up
* @param {*} decimalPlaces : decimal places 
*/
function roundUp(value, decimalPlaces) {
  return parseFloat((value * 100) / 100).toFixed(decimalPlaces);
}

/**
 * Render each frame
 */
function renderFrames() {
  for (var indobj = 0; indobj < alldata[frame].length - 1; indobj++) {
    if (alldata[frame][indobj][0].type == "newObj") {
      //create new object
      createNewObject(alldata[frame][indobj][0].data);
    } else {
      //update objects w.r.t frames
      renderObject(alldata[frame][indobj][0].data);
    }
  }

  //camera is on last index of each frame. 
  //Get position from each frame but target from first frame only so that user can rotate camera as they wisj
  if (frame == 1 && alldata[frame][alldata[frame].length - 1].type == "camera") {
    defaultCameraPosition = new BABYLON.Vector3(-alldata[frame][indobj].position[1],
      alldata[frame][indobj].position[2], alldata[frame][indobj].position[0]);
    camera.setPosition(defaultCameraPosition);
    camera.setTarget(new BABYLON.Vector3(-alldata[frame][indobj].lookAtPosition[1],
      alldata[frame][indobj].lookAtPosition[2], alldata[frame][indobj].lookAtPosition[0]));
    camera.radius = 7;//a little zoomed in camera...

  }

}

async function createNewObject(data) {
  switch (data.name) {
    case "Sphere":
      obj3d.push(BABYLON.MeshBuilder.CreateSphere(data.name, { diameterX: 1, diameterY: 1, diameterZ: 1 }, scene));
      break;
    case "Box":
      obj3d.push(BABYLON.MeshBuilder.CreateBox(data.name, { height: 1, width: 1, depth: 1 }, scene));
      break;
    case "Cylinder":
      obj3d.push(BABYLON.MeshBuilder.CreateCylinder(data.name, {diameterTop: 1, tessellation: 4}, scene));
      break;
    case "Cone":
      obj3d.push(BABYLON.MeshBuilder.CreateCylinder(data.name, {diameterTop: 0, tessellation: 4}, scene));
      break;
    case "Plane":
      obj3d.push(BABYLON.MeshBuilder.CreatePlane("plane", {width: 5, size:5, tileSize:1}, scene));
      break;
    case "Text":
      obj3d.push(make_textline(data.text, data.position[0], data.position[1], data.position[2], "left", data.color, 3, 0.1, true, 0.05));
      break;
    case "OBJ":
      switch (data.path) {
        case "car" :
          var car = (await BABYLON.SceneLoader.ImportMeshAsync('', './_3D/car/','car.obj', scene)).meshes
          obj3d.push(car);
          obj3d[obj3d.length - 1].name = "Custom3D";
          break;
        case "motor" :
          var motor = (await BABYLON.SceneLoader.ImportMeshAsync('', './_3D/motor/','motor.obj', scene)).meshes
          obj3d.push(motor);
          obj3d[obj3d.length - 1].name = "Custom3D";
          break;
        case "house" :
          var house = (await BABYLON.SceneLoader.ImportMeshAsync('', './_3D/house/','house.obj', scene)).meshes
          obj3d.push(house);
          obj3d[obj3d.length - 1].name = "Custom3D";
          break;
        case "sensor" :
          var sensor = (await BABYLON.SceneLoader.ImportMeshAsync('', './_3D/sensor/','sensor.obj', scene)).meshes
          obj3d.push(sensor);
          obj3d[obj3d.length - 1].name = "Custom3D";
          break;
        case "truck" :
          var truck = (await BABYLON.SceneLoader.ImportMeshAsync('', './_3D/truck/','truck.obj', scene)).meshes
          obj3d.push(truck);
          obj3d[obj3d.length - 1].name = "Custom3D";
          break;
      }
      break;
    default:
      return;
  }
  obj3d[obj3d.length - 1].id = data.id;
  var mat = new BABYLON.StandardMaterial("wpMat", scene);
  mat.specularColor = new BABYLON.Color3.Black();
  mat.emissiveColor = new BABYLON.Color3(data.color[0], data.color[1], data.color[2]);
  mat.alpha = data.transparency > 0 ? 0.7 : 1;
  obj3d[obj3d.length - 1].material = mat;
}

function renderObject(data) {
  //ALL properties such as position,scale,color etc from JSOn file
  obj3d.forEach(obj => {
    if (data.id === obj.id) {
      //this animation belong to this object...
      //BabylonJS coordiante system is different, we have to make transformations.
      var pos = new BABYLON.Vector3(parseFloat(data.position[0].toFixed(2)),
        parseFloat(data.position[2].toFixed(2)),
        parseFloat(data.position[1].toFixed(2)));
      var rotation = new BABYLON.Vector3(parseFloat(-data.angle[0].toFixed(2)),
        parseFloat(-data.angle[2].toFixed(2)),
        parseFloat(data.angle[1].toFixed(2)));

      //we dont always have x,y,z indexes
      var sizex = data.size[0].toFixed(2);
      var index = 1 % data.size.length;
      var sizez = data.size[index].toFixed(2);
      index = (index + 1) % data.size.length;
      var sizey = data.size[index].toFixed(2);

      var scale = new BABYLON.Vector3(sizex,
        sizey,
        sizez);
      
      if (obj.name == "Custom3D"){
        obj[0].position = pos;
        obj[0].scaling = scale;
        obj[0].rotation = rotation;
      } else {
        obj.position = pos;
        obj.scaling = scale;
        obj.rotation = rotation;
      }

      obj.material.emissiveColor = new BABYLON.Color3(data.color[0], data.color[1], data.color[2]);
      obj.material.alpha = data.transparency > 0 ? 0.7 : 1;
    }
  });
}

// 3D text rendering
// fontdata, used to create letters
var font=[]
font[0]=[[[0,21]],[[15,21]]]
font[1]=[[[0,21]],[[15,21]]]
font[2]=[[[5,21],[ 5,7]],[[5,2],[ 4,1],[ 5,0],[ 6,1],[ 5,2]]]
font[3]=[[[4,21],[ 4,14]],[[12,21],[ 12,14]]]
font[4]=[[[11.5,25],[ 4.5,-7]],[[17.5,25],[ 10.5,-7]],[[4.5,12],[ 18.5,12]],[[3.5,6],[ 17.5,6]]]
font[5]=[[[8,25],[ 8,-4]],[[12,25],[ 12,-4]],[[17,18],[ 15,20],[ 12,21],[ 8,21],[ 5,20],[ 3,18],[ 3,16],[ 4,14],[ 5,13],[ 7,12],[ 13,10],[ 15,9],[ 16,8],[ 17,6],[ 17,3],[ 15,1],[ 12,0],[ 8,0],[ 5,1],[ 3,3]]]
font[6]=[[[21,21],[ 3,0]],[[8,21],[ 10,19],[ 10,17],[ 9,15],[ 7,14],[ 5,14],[ 3,16],[ 3,18],[ 4,20],[ 6,21],[ 8,21],[ 10,20],[ 13,19],[ 16,19],[ 19,20],[ 21,21]],[[17,7],[ 15,6],[ 14,4],[ 14,2],[ 16,0],[ 18,0],[ 20,1],[ 21,3],[ 21,5],[ 19,7],[ 17,7]]]
font[7]=[[[23,12],[ 23,13],[ 22,14],[ 21,14],[ 20,13],[ 19,11],[ 17,6],[ 15,3],[ 13,1],[ 11,0],[ 7,0],[ 5,1],[ 4,2],[ 3,4],[ 3,6],[ 4,8],[ 5,9],[ 12,13],[ 13,14],[ 14,16],[ 14,18],[ 13,20],[ 11,21],[ 9,20],[ 8,18],[ 8,16],[ 9,13],[ 11,10],[ 16,3],[ 18,1],[ 20,0],[ 22,0],[ 23,1],[ 23,2]]]
font[8]=[[[5,19],[ 4,20],[ 5,21],[ 6,20],[ 6,18],[ 5,16],[ 4,15]]]
font[9]=[[[11,25],[ 9,23],[ 7,20],[ 5,16],[ 4,11],[ 4,7],[ 5,2],[ 7,-2],[ 9,-5],[ 11,-7]]]
font[10]=[[[3,25],[ 5,23],[ 7,20],[ 9,16],[ 10,11],[ 10,7],[ 9,2],[ 7,-2],[ 5,-5],[ 3,-7]]]
font[11]=[[[8,21],[ 8,9]],[[3,18],[ 13,12]],[[13,18],[ 3,12]]]
font[12]=[[[13,18],[ 13,0]],[[4,9],[ 22,9]]]
font[13]=[[[6,1],[ 5,0],[ 4,1],[ 5,2],[ 6,1],[ 6,-1],[ 5,-3],[ 4,-4]]]
font[14]=[[[4,9],[ 22,9]]]
font[15]=[[[5,2],[ 4,1],[ 5,0],[ 6,1],[ 5,2]]]
font[16]=[[[20,25],[ 2,-7]]]
font[17]=[[[9,21],[ 6,20],[ 4,17],[ 3,12],[ 3,9],[ 4,4],[ 6,1],[ 9,0],[ 11,0],[ 14,1],[ 16,4],[ 17,9],[ 17,12],[ 16,17],[ 14,20],[ 11,21],[ 9,21]]]
font[18]=[[[6,17],[ 8,18],[ 11,21],[ 11,0]]]
font[19]=[[[4,16],[ 4,17],[ 5,19],[ 6,20],[ 8,21],[ 12,21],[ 14,20],[ 15,19],[ 16,17],[ 16,15],[ 15,13],[ 13,10],[ 3,0],[ 17,0]]]
font[20]=[[[5,21],[ 16,21],[ 10,13],[ 13,13],[ 15,12],[ 16,11],[ 17,8],[ 17,6],[ 16,3],[ 14,1],[ 11,0],[ 8,0],[ 5,1],[ 4,2],[ 3,4]]]
font[21]=[[[13,21],[ 3,7],[ 18,7]],[[13,21],[ 13,0]]]
font[22]=[[[15,21],[ 5,21],[ 4,12],[ 5,13],[ 8,14],[ 11,14],[ 14,13],[ 16,11],[ 17,8],[ 17,6],[ 16,3],[ 14,1],[ 11,0],[ 8,0],[ 5,1],[ 4,2],[ 3,4]]]
font[23]=[[[16,18],[ 15,20],[ 12,21],[ 10,21],[ 7,20],[ 5,17],[ 4,12],[ 4,7],[ 5,3],[ 7,1],[ 10,0],[ 11,0],[ 14,1],[ 16,3],[ 17,6],[ 17,7],[ 16,10],[ 14,12],[ 11,13],[ 10,13],[ 7,12],[ 5,10],[ 4,7]]]
font[24]=[[[17,21],[ 7,0]],[[3,21],[ 17,21]]]
font[25]=[[[8,21],[ 5,20],[ 4,18],[ 4,16],[ 5,14],[ 7,13],[ 11,12],[ 14,11],[ 16,9],[ 17,7],[ 17,4],[ 16,2],[ 15,1],[ 12,0],[ 8,0],[ 5,1],[ 4,2],[ 3,4],[ 3,7],[ 4,9],[ 6,11],[ 9,12],[ 13,13],[ 15,14],[ 16,16],[ 16,18],[ 15,20],[ 12,21],[ 8,21]]]
font[26]=[[[16,14],[ 15,11],[ 13,9],[ 10,8],[ 9,8],[ 6,9],[ 4,11],[ 3,14],[ 3,15],[ 4,18],[ 6,20],[ 9,21],[ 10,21],[ 13,20],[ 15,18],[ 16,14],[ 16,9],[ 15,4],[ 13,1],[ 10,0],[ 8,0],[ 5,1],[ 4,3]]]
font[27]=[[[5,14],[ 4,13],[ 5,12],[ 6,13],[ 5,14]],[[5,2],[ 4,1],[ 5,0],[ 6,1],[ 5,2]]]
font[28]=[[[5,14],[ 4,13],[ 5,12],[ 6,13],[ 5,14]],[[6,1],[ 5,0],[ 4,1],[ 5,2],[ 6,1],[ 6,-1],[ 5,-3],[ 4,-4]]]
font[29]=[[[20,18],[ 4,9],[ 20,0]]]
font[30]=[[[4,12],[ 22,12]],[[4,6],[ 22,6]]]
font[31]=[[[4,18],[ 20,9],[ 4,0]]]
font[32]=[[[3,16],[ 3,17],[ 4,19],[ 5,20],[ 7,21],[ 11,21],[ 13,20],[ 14,19],[ 15,17],[ 15,15],[ 14,13],[ 13,12],[ 9,10],[ 9,7]],[[9,2],[ 8,1],[ 9,0],[ 10,1],[ 9,2]]]
font[33]=[[[18.5,13],[ 17.5,15],[ 15.5,16],[ 12.5,16],[ 10.5,15],[ 9.5,14],[ 8.5,11],[ 8.5,8],[ 9.5,6],[ 11.5,5],[ 14.5,5],[ 16.5,6],[ 17.5,8]],[[12.5,16],[ 10.5,14],[ 9.5,11],[ 9.5,8],[ 10.5,6],[ 11.5,5]],[[18.5,16],[ 17.5,8],[ 17.5,6],[ 19.5,5],[ 21.5,5],[ 23.5,7],[ 24.5,10],[ 24.5,12],[ 23.5,15],[ 22.5,17],[ 20.5,19],[ 18.5,20],[ 15.5,21],[ 12.5,21],[ 9.5,20],[ 7.5,19],[ 5.5,17],[ 4.5,15],[ 3.5,12],[ 3.5,9],[ 4.5,6],[ 5.5,4],[ 7.5,2],[ 9.5,1],[ 12.5,0],[ 15.5,0],[ 18.5,1],[ 20.5,2],[ 21.5,3]],[[19.5,16],[ 18.5,8],[ 18.5,6],[ 19.5,5]]]
font[34]=[[[9,21],[ 1,0]],[[9,21],[ 17,0]],[[4,7],[ 14,7]]]
font[35]=[[[3.5,21],[ 3.5,0]],[[3.5,21],[ 12.5,21],[ 15.5,20],[ 16.5,19],[ 17.5,17],[ 17.5,15],[ 16.5,13],[ 15.5,12],[ 12.5,11]],[[3.5,11],[ 12.5,11],[ 15.5,10],[ 16.5,9],[ 17.5,7],[ 17.5,4],[ 16.5,2],[ 15.5,1],[ 12.5,0],[ 3.5,0]]]
font[36]=[[[18.5,16],[ 17.5,18],[ 15.5,20],[ 13.5,21],[ 9.5,21],[ 7.5,20],[ 5.5,18],[ 4.5,16],[ 3.5,13],[ 3.5,8],[ 4.5,5],[ 5.5,3],[ 7.5,1],[ 9.5,0],[ 13.5,0],[ 15.5,1],[ 17.5,3],[ 18.5,5]]]
font[37]=[[[3.5,21],[ 3.5,0]],[[3.5,21],[ 10.5,21],[ 13.5,20],[ 15.5,18],[ 16.5,16],[ 17.5,13],[ 17.5,8],[ 16.5,5],[ 15.5,3],[ 13.5,1],[ 10.5,0],[ 3.5,0]]]
font[38]=[[[3.5,21],[ 3.5,0]],[[3.5,21],[ 16.5,21]],[[3.5,11],[ 11.5,11]],[[3.5,0],[ 16.5,0]]]
font[39]=[[[3,21],[ 3,0]],[[3,21],[ 16,21]],[[3,11],[ 11,11]]]
font[40]=[[[18.5,16],[ 17.5,18],[ 15.5,20],[ 13.5,21],[ 9.5,21],[ 7.5,20],[ 5.5,18],[ 4.5,16],[ 3.5,13],[ 3.5,8],[ 4.5,5],[ 5.5,3],[ 7.5,1],[ 9.5,0],[ 13.5,0],[ 15.5,1],[ 17.5,3],[ 18.5,5],[ 18.5,8]],[[13.5,8],[ 18.5,8]]]
font[41]=[[[4,21],[ 4,0]],[[18,21],[ 18,0]],[[4,11],[ 18,11]]]
font[42]=[[[4,21],[ 4,0]]]
font[43]=[[[12,21],[ 12,5],[ 11,2],[ 10,1],[ 8,0],[ 6,0],[ 4,1],[ 3,2],[ 2,5],[ 2,7]]]
font[44]=[[[3.5,21],[ 3.5,0]],[[17.5,21],[ 3.5,7]],[[8.5,12],[ 17.5,0]]]
font[45]=[[[2.5,21],[ 2.5,0]],[[2.5,0],[ 14.5,0]]]
font[46]=[[[4,21],[ 4,0]],[[4,21],[ 12,0]],[[20,21],[ 12,0]],[[20,21],[ 20,0]]]
font[47]=[[[4,21],[ 4,0]],[[4,21],[ 18,0]],[[18,21],[ 18,0]]]
font[48]=[[[9,21],[ 7,20],[ 5,18],[ 4,16],[ 3,13],[ 3,8],[ 4,5],[ 5,3],[ 7,1],[ 9,0],[ 13,0],[ 15,1],[ 17,3],[ 18,5],[ 19,8],[ 19,13],[ 18,16],[ 17,18],[ 15,20],[ 13,21],[ 9,21]]]
font[49]=[[[3.5,21],[ 3.5,0]],[[3.5,21],[ 12.5,21],[ 15.5,20],[ 16.5,19],[ 17.5,17],[ 17.5,14],[ 16.5,12],[ 15.5,11],[ 12.5,10],[ 3.5,10]]]
font[50]=[[[9,21],[ 7,20],[ 5,18],[ 4,16],[ 3,13],[ 3,8],[ 4,5],[ 5,3],[ 7,1],[ 9,0],[ 13,0],[ 15,1],[ 17,3],[ 18,5],[ 19,8],[ 19,13],[ 18,16],[ 17,18],[ 15,20],[ 13,21],[ 9,21]],[[12,4],[ 18,-2]]]
font[51]=[[[3.5,21],[ 3.5,0]],[[3.5,21],[ 12.5,21],[ 15.5,20],[ 16.5,19],[ 17.5,17],[ 17.5,15],[ 16.5,13],[ 15.5,12],[ 12.5,11],[ 3.5,11]],[[10.5,11],[ 17.5,0]]]
font[52]=[[[17,18],[ 15,20],[ 12,21],[ 8,21],[ 5,20],[ 3,18],[ 3,16],[ 4,14],[ 5,13],[ 7,12],[ 13,10],[ 15,9],[ 16,8],[ 17,6],[ 17,3],[ 15,1],[ 12,0],[ 8,0],[ 5,1],[ 3,3]]]
font[53]=[[[8,21],[ 8,0]],[[1,21],[ 15,21]]]
font[54]=[[[4,21],[ 4,6],[ 5,3],[ 7,1],[ 10,0],[ 12,0],[ 15,1],[ 17,3],[ 18,6],[ 18,21]]]
font[55]=[[[1,21],[ 9,0]],[[17,21],[ 9,0]]]
font[56]=[[[2,21],[ 7,0]],[[12,21],[ 7,0]],[[12,21],[ 17,0]],[[22,21],[ 17,0]]]
font[57]=[[[3,21],[ 17,0]],[[17,21],[ 3,0]]]
font[58]=[[[1,21],[ 9,11],[ 9,0]],[[17,21],[ 9,11]]]
font[59]=[[[17,21],[ 3,0]],[[3,21],[ 17,21]],[[3,0],[ 17,0]]]
font[60]=[[[4,25],[ 4,-7]],[[5,25],[ 5,-7]],[[4,25],[ 11,25]],[[4,-7],[ 11,-7]]]
font[61]=[[[0,21],[ 14,-3]]]
font[62]=[[[9,25],[ 9,-7]],[[10,25],[ 10,-7]],[[3,25],[ 10,25]],[[3,-7],[ 10,-7]]]
font[63]=[[[6,15],[ 8,18],[ 10,15]],[[3,12],[ 8,17],[ 13,12]],[[8,17],[ 8,0]]]
font[64]=[[[0,-2],[ 16,-2]]]
font[65]=[[[6,21],[ 5,20],[ 4,18],[ 4,16],[ 5,15],[ 6,16],[ 5,17]]]
font[66]=[[[15.5,14],[ 15.5,0]],[[15.5,11],[ 13.5,13],[ 11.5,14],[ 8.5,14],[ 6.5,13],[ 4.5,11],[ 3.5,8],[ 3.5,6],[ 4.5,3],[ 6.5,1],[ 8.5,0],[ 11.5,0],[ 13.5,1],[ 15.5,3]]]
font[67]=[[[3.5,21],[ 3.5,0]],[[3.5,11],[ 5.5,13],[ 7.5,14],[ 10.5,14],[ 12.5,13],[ 14.5,11],[ 15.5,8],[ 15.5,6],[ 14.5,3],[ 12.5,1],[ 10.5,0],[ 7.5,0],[ 5.5,1],[ 3.5,3]]]
font[68]=[[[15,11],[ 13,13],[ 11,14],[ 8,14],[ 6,13],[ 4,11],[ 3,8],[ 3,6],[ 4,3],[ 6,1],[ 8,0],[ 11,0],[ 13,1],[ 15,3]]]
font[69]=[[[15.5,21],[ 15.5,0]],[[15.5,11],[ 13.5,13],[ 11.5,14],[ 8.5,14],[ 6.5,13],[ 4.5,11],[ 3.5,8],[ 3.5,6],[ 4.5,3],[ 6.5,1],[ 8.5,0],[ 11.5,0],[ 13.5,1],[ 15.5,3]]]
font[70]=[[[3,8],[ 15,8],[ 15,10],[ 14,12],[ 13,13],[ 11,14],[ 8,14],[ 6,13],[ 4,11],[ 3,8],[ 3,6],[ 4,3],[ 6,1],[ 8,0],[ 11,0],[ 13,1],[ 15,3]]]
font[71]=[[[11,21],[ 9,21],[ 7,20],[ 6,17],[ 6,0]],[[3,14],[ 10,14]]]
font[72]=[[[15.5,14],[ 15.5,-2],[ 14.5,-5],[ 13.5,-6],[ 11.5,-7],[ 8.5,-7],[ 6.5,-6]],[[15.5,11],[ 13.5,13],[ 11.5,14],[ 8.5,14],[ 6.5,13],[ 4.5,11],[ 3.5,8],[ 3.5,6],[ 4.5,3],[ 6.5,1],[ 8.5,0],[ 11.5,0],[ 13.5,1],[ 15.5,3]]]
font[73]=[[[4.5,21],[ 4.5,0]],[[4.5,10],[ 7.5,13],[ 9.5,14],[ 12.5,14],[ 14.5,13],[ 15.5,10],[ 15.5,0]]]
font[74]=[[[3,21],[ 4,20],[ 5,21],[ 4,22],[ 3,21]],[[4,14],[ 4,0]]]
font[75]=[[[5,21],[ 6,20],[ 7,21],[ 6,22],[ 5,21]],[[6,14],[ 6,-3],[ 5,-6],[ 3,-7],[ 1,-7]]]
font[76]=[[[3.5,21],[ 3.5,0]],[[13.5,14],[ 3.5,4]],[[7.5,8],[ 14.5,0]]]
font[77]=[[[4,21],[ 4,0]]]
font[78]=[[[4,14],[ 4,0]],[[4,10],[ 7,13],[ 9,14],[ 12,14],[ 14,13],[ 15,10],[ 15,0]],[[15,10],[ 18,13],[ 20,14],[ 23,14],[ 25,13],[ 26,10],[ 26,0]]]
font[79]=[[[4.5,14],[ 4.5,0]],[[4.5,10],[ 7.5,13],[ 9.5,14],[ 12.5,14],[ 14.5,13],[ 15.5,10],[ 15.5,0]]]
font[80]=[[[8.5,14],[ 6.5,13],[ 4.5,11],[ 3.5,8],[ 3.5,6],[ 4.5,3],[ 6.5,1],[ 8.5,0],[ 11.5,0],[ 13.5,1],[ 15.5,3],[ 16.5,6],[ 16.5,8],[ 15.5,11],[ 13.5,13],[ 11.5,14],[ 8.5,14]]]
font[81]=[[[3.5,14],[ 3.5,-7]],[[3.5,11],[ 5.5,13],[ 7.5,14],[ 10.5,14],[ 12.5,13],[ 14.5,11],[ 15.5,8],[ 15.5,6],[ 14.5,3],[ 12.5,1],[ 10.5,0],[ 7.5,0],[ 5.5,1],[ 3.5,3]]]
font[82]=[[[15.5,14],[ 15.5,-7]],[[15.5,11],[ 13.5,13],[ 11.5,14],[ 8.5,14],[ 6.5,13],[ 4.5,11],[ 3.5,8],[ 3.5,6],[ 4.5,3],[ 6.5,1],[ 8.5,0],[ 11.5,0],[ 13.5,1],[ 15.5,3]]]
font[83]=[[[3.5,14],[ 3.5,0]],[[3.5,8],[ 4.5,11],[ 6.5,13],[ 8.5,14],[ 11.5,14]]]
font[84]=[[[14.5,11],[ 13.5,13],[ 10.5,14],[ 7.5,14],[ 4.5,13],[ 3.5,11],[ 4.5,9],[ 6.5,8],[ 11.5,7],[ 13.5,6],[ 14.5,4],[ 14.5,3],[ 13.5,1],[ 10.5,0],[ 7.5,0],[ 4.5,1],[ 3.5,3]]]
font[85]=[[[6,21],[ 6,4],[ 7,1],[ 9,0],[ 11,0]],[[3,14],[ 10,14]]]
font[86]=[[[4.5,14],[ 4.5,4],[ 5.5,1],[ 7.5,0],[ 10.5,0],[ 12.5,1],[ 15.5,4]],[[15.5,14],[ 15.5,0]]]
font[87]=[[[2,14],[ 8,0]],[[14,14],[ 8,0]]]
font[88]=[[[3,14],[ 7,0]],[[11,14],[ 7,0]],[[11,14],[ 15,0]],[[19,14],[ 15,0]]]
font[89]=[[[3.5,14],[ 14.5,0]],[[14.5,14],[ 3.5,0]]]
font[90]=[[[2,14],[ 8,0]],[[14,14],[ 8,0],[ 6,-4],[ 4,-6],[ 2,-7],[ 1,-7]]]
font[91]=[[[14.5,14],[ 3.5,0]],[[3.5,14],[ 14.5,14]],[[3.5,0],[ 14.5,0]]]
font[92]=[[[9,25],[ 7,24],[ 6,23],[ 5,21],[ 5,19],[ 6,17],[ 7,16],[ 8,14],[ 8,12],[ 6,10]],[[7,24],[ 6,22],[ 6,20],[ 7,18],[ 8,17],[ 9,15],[ 9,13],[ 8,11],[ 4,9],[ 8,7],[ 9,5],[ 9,3],[ 8,1],[ 7,0],[ 6,-2],[ 6,-4],[ 7,-6]],[[6,8],[ 8,6],[ 8,4],[ 7,2],[ 6,1],[ 5,-1],[ 5,-3],[ 6,-5],[ 7,-6],[ 9,-7]]]
font[93]=[[[4,25],[ 4,-7]]]
font[94]=[[[5,25],[ 7,24],[ 8,23],[ 9,21],[ 9,19],[ 8,17],[ 7,16],[ 6,14],[ 6,12],[ 8,10]],[[7,24],[ 8,22],[ 8,20],[ 7,18],[ 6,17],[ 5,15],[ 5,13],[ 6,11],[ 10,9],[ 6,7],[ 5,5],[ 5,3],[ 6,1],[ 7,0],[ 8,-2],[ 8,-4],[ 7,-6]],[[8,8],[ 6,6],[ 6,4],[ 7,2],[ 8,1],[ 9,-1],[ 9,-3],[ 8,-5],[ 7,-6],[ 5,-7]]]
font[95]=[[[3,6],[ 3,8],[ 4,11],[ 6,12],[ 8,12],[ 10,11],[ 14,8],[ 16,7],[ 18,7],[ 20,8],[ 21,10]],[[3,8],[ 4,10],[ 6,11],[ 8,11],[ 10,10],[ 14,7],[ 16,6],[ 18,6],[ 20,7],[ 21,10],[ 21,12]]]

// make circle shape (used for generating fat letters)
function circle(radius, steps, centerX, centerY) {
    shape = []
    for (var i = 0; i < steps+1 ; i++) {
        x = centerX + radius * Math.cos(Math.PI * i / steps * 2 - Math.PI / 2)
        y = centerY + radius * Math.sin(Math.PI * i / steps * 2 - Math.PI / 2)
        shape.push(new BABYLON.Vector3(x, y, 0))
    }
}

function make_textline(str, x,y,z,align, color,fontscale, spacing,fat,boldness,gloss) {
   fontscale/=100
    if(fat){
        circle(boldness, 36, 0, 0)
    }
    mat = new BABYLON.StandardMaterial("mat1", scene);
  
    mat.diffuseColor = new BABYLON.Color3(color[0], color[1], color[2]);
    mat.emissiveColor = new BABYLON.Color3.Black();
    mat.specularColor = new BABYLON.Color3(gloss, gloss, gloss);
    mat.backFaceCulling = true;

    word = new BABYLON.Mesh.CreateBox("word", 0, scene);
    word.visibility = total = 0
    for (letter = 0; letter < str.length; letter++) {
        char = make_character(font[str.charCodeAt(letter) - 31], color,fontscale,spacing,str.charCodeAt(letter) - 31,fat);
        char.position.x = total - min * fontscale
        total += size + spacing
        char.parent = word
    }
    if (align == "center") {
        var offset = total / 2
    } else if (align == "right") {
        var offset = total
    } else if (align == "left") {
        var offset = 0
    }
    var children = word.getChildren();
    for (var i = 0; i < children.length; i++) {
        children[i].position.x -= offset
    }
    word.position=new BABYLON.Vector3(x,y,z)
    return word
}
function make_character(a, color, fontscale, spacing,ss,fat,boldness) {
    min = 100
    max = -100
    tempchar =  new BABYLON.Mesh.CreateBox("name", 0, scene);
    tempchar.visibility = 0
    for (tt = 0; tt < a.length; tt++) {
        char = a[tt]
        var ppath = []
        for (t = 0; t < char.length; t++) {
            ppath.push(new BABYLON.Vector3(char[t][0] * fontscale, char[t][1] * fontscale, 0));
            min = Math.min(min, char[t][0])
            max = Math.max(max, char[t][0])
        }
        if(ss!=1){
            if(fat){
                var lines1 = BABYLON.MeshBuilder.ExtrudeShape("extrudedShape", {
                    cap: 3,
                    shape: shape,
                    path: ppath,
                    sideOrientation: BABYLON.Mesh.DOUBLESIDE
                }, scene);
                lines1.material = mat
                lines1.material.diffuseColor = new BABYLON.Color3(color[0], color[1], color[2]);
            }else{
                lines1 = BABYLON.Mesh.CreateLines("lines", ppath, scene);}
                lines1.color = new BABYLON.Color3(color[0], color[1], color[2]);
                lines1.parent = tempchar
            } 
        }
        size = (max - min) * fontscale
        return tempchar
}

// show axis
function showAxis(size) {
  var makeTextPlane = function(text, color, size) {
  var dynamicTexture = new BABYLON.DynamicTexture("DynamicTexture", 50, scene, true);
  dynamicTexture.hasAlpha = true;
  dynamicTexture.drawText(text, 5, 40, "bold 36px Arial", color , "transparent", true);
  var plane = new BABYLON.Mesh.CreatePlane("TextPlane", size, scene, true);
  plane.material = new BABYLON.StandardMaterial("TextPlaneMaterial", scene);
  plane.material.backFaceCulling = false;
  plane.material.specularColor = new BABYLON.Color3(0, 0, 0);
  plane.material.diffuseTexture = dynamicTexture;
  return plane;
   };

  var axisX = BABYLON.Mesh.CreateLines("axisX", [ 
    new BABYLON.Vector3.Zero(), new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, 0, 0.05 * size), 
    new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, 0, -0.05 * size)
    ], scene);
  axisX.color = new BABYLON.Color3(0, 0, 1);
  var xChar = makeTextPlane("X", "blue", size / 10);
  xChar.position = new BABYLON.Vector3(0.9 * size, 0, -0.05 * size);
  xChar.parent = axisX;
  var axisY = BABYLON.Mesh.CreateLines("axisZ", [
    new BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3( 0 , -0.05 * size, size * 0.95),
    new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3( 0, 0.05 * size, size * 0.95)
    ], scene);
  axisY.color = new BABYLON.Color3(1, 0, 0);
  var yChar = makeTextPlane("Y", "red", size / 10);
  yChar.position = new BABYLON.Vector3(0, 0.05 * size, 0.9 * size);
  yChar.parent = axisY;
  var axisZ = BABYLON.Mesh.CreateLines("axisY", [
    new BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3( -0.05 * size, size * 0.95, 0), 
    new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3( 0.05 * size, size * 0.95, 0)
    ], scene);
  axisZ.color = new BABYLON.Color3(0, 1, 0);
  var zChar = makeTextPlane("Z", "green", size / 10);
  zChar.position = new BABYLON.Vector3(0, 0.9 * size, -0.05 * size);
  zChar.parent = axisZ;

  obj3d.push(axisX);
  obj3d[obj3d.length - 1].id = "showAxis X";
  obj3d.push(axisY);
  obj3d[obj3d.length - 1].id = "showAxis Y";
  obj3d.push(axisZ);
  obj3d[obj3d.length - 1].id = "showAxis Z";
};

/** =================================  END BABYLONJS CANVAS  ======================================== */

/** Helper Functions */
function loopBuffer() {
  var start = window.performance.now();
  buffer.open('GET', host  + '/api/buffer', true);
  //req.setRequestHeader("Csrf-Token", CsrfToken);
  buffer.send();
  buffer.onload = function(event) {
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
  var stop = window.performance.now();
  // Did not use setInterval to make sure the function ended before another loop is called.
  gettingAcumenAnswers = setTimeout(loopBuffer, Math.max(10, 333 - (stop - start)));
}

function populateFontMenu() {
  let fonts = [/*'Monospaced', */'Consolas', 'Courier New', 'Lucida Console'];
  menuNode = document.getElementById("fontMenu");
  editorNode = document.getElementById("editor");
  for (let i = 0; i < fonts.length; i++) {
    let node = document.createElement("li");
    let label = document.createElement("label");
    let input = document.createElement("input");
    let text = document.createTextNode(fonts[i]);
    input.setAttribute('type', "radio");
    input.setAttribute('name', 'font');
    input.setAttribute('id', fonts[i].replace(' ', ''));
    input.onclick = function () { 
      console.log("set theme : " + fonts[i]);
      editorNode.style.fontFamily = fonts[i]; }
    if (i == 3) { input.checked = true; }
    label.appendChild(input);
    label.appendChild(text);
    node.appendChild(label);
    menuNode.appendChild(node);
  }
}

function populateThemeMenu() {
  let themes = ["dreamweaver", "textmate", "ambiance", "dracula"];
  menuNode = document.getElementById("themeMenu");
  for (let i = 0; i < themes.length; i++) {
    let node = document.createElement("li");
    let label = document.createElement("label");
    let input = document.createElement("input");
    let text = document.createTextNode(themes[i]);
    input.setAttribute('type', "radio");
    input.setAttribute('name', 'theme');
    input.setAttribute('id', themes[i]);
    input.onclick = function () { editor.setTheme("ace/theme/" + themes[i]); }
    if (i == 0) { input.checked = true; }
    label.appendChild(input);
    label.appendChild(text);
    node.appendChild(label);
    menuNode.appendChild(node);
  }
}

function updateInput() {
  // clear data
  resetScene();
  var table = document.getElementById("traceTable");
  while (table.hasChildNodes()) {
    table.removeChild(table.firstChild);
  }
  var graphDiv = document.getElementById("plotChart");
  while (graphDiv.hasChildNodes()){
    graphDiv.removeChild(graphDiv.firstChild);
  }
  document.getElementById("showAxis").style.checked = false;
  camera.position = defaultCameraPosition;
  camera.setTarget(new BABYLON.Vector3(0, 0, 0));
  timelineSlider.value = 0;
  time.innerHTML = "Time: ";
  document.getElementById("progressBar").value = 0;
  //
  document.getElementById("undoAction").disabled = !editor.session.getUndoManager().hasUndo();
  document.getElementById("redoAction").disabled = !editor.session.getUndoManager().hasRedo();
  req.open('POST', url, true);
  //req.setRequestHeader("Csrf-Token", CsrfToken);
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
  if (file[0][0] == 'children' && file[0][1].length > 0) {
    for (i = 0; i < file[0][1].length; i++) {
      let folderNode = document.createElement("li");
      let span = document.createElement('span');
      span.innerHTML = file[0][1][i][2][1];
      span.id = '[ID]' + file[0][1][i][1][1];
      span.className = 'caret';
      folderNode.appendChild(span);
      let nestedNode = document.createElement("ol");
      nestedNode.className = 'nestedNode';
      folderNode.appendChild(nestedNode);
      createChildNodes(file[0][1][i][0], nestedNode)
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
  if (file[0] == 'children' && file[1].length > 0) {
    for (let j = 0; j < file[1].length; j++) {
      if (file[1][j][0][0] == 'children') {
        let folderNodeC = document.createElement("li");
        let spanC = document.createElement('span');
        spanC.innerHTML = file[1][j][2][1];
        spanC.id = '[ID]' + file[1][j][1][1];
        spanC.className = 'caret';
        folderNodeC.appendChild(spanC);
        let nestedNodeC = document.createElement("ol");
        nestedNodeC.className = 'nestedNode';
        if (file[1][j][0][1].length > 0) {
          createChildNodes(file[1][j][0], nestedNodeC);
        }
        folderNodeC.appendChild(nestedNodeC);
        parentNode.appendChild(folderNodeC);
      }
      else {
        let fileNodeC = document.createElement("li");
        fileNodeC.id = '[ID]' + file[1][j][0][1];
        fileNodeC.addEventListener("click", function () { 
          req.open('POST', url, true);
          //req.setRequestHeader("Csrf-Token", CsrfToken);
          req.send("[" + JSON.stringify(selectFile(fileNodeC.id.substring(4))) + "]\r") 
        });
        let textC = document.createTextNode(file[1][j][1][1]);
        fileNodeC.style.cursor = "pointer";
        fileNodeC.appendChild(textC);
        parentNode.appendChild(fileNodeC);
      }
    }
  }
  else {
    let fileNode = document.createElement("li");
    fileNode.id = '[ID]' + file[0][1];
    fileNode.addEventListener("click", function () { console.log(fileNode.id) });
    let text = document.createTextNode(file[1][1]);
    fileNode.appendChild(text);
  }
}

function sortByKey(jsObj){
  var sortedArray = [];
  var keywords = ["children", "id", "name"];

  for(var i in jsObj)
  {
    if (keywords.find(elmt => elmt == i) != undefined){
      var shuffledArray = jsObj[i];
      if (i == 'children'){
        shuffledArray.sort((a, b) => {
          if (a.name != undefined && b.name != undefined){
            return a.name.localeCompare(b.name);
          } else {
            return a[2][1].localeCompare(b[2][1]);
          }
        });
      }
      sortedArray.push([i, shuffledArray]);
    } else {
      sortedArray.push(jsObj[i]);
    }
  }

  sortedArray.forEach(obj => {
    if (obj[0] == 'children') {
      for (let j = 0; j < obj[1].length; j++){
        obj[1][j] = sortByKey(obj[1][j]);
      }
    }
  })
  
  return sortedArray.sort();
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
