'use strict';

//declare app
var demo_app = angular.module('demo_app', []);

//create service for loading file
demo_app.service('LogLoadService', function($q) {
    var _log;
    
    this.loadLogFile = function(file, callback) {
        var defer = $q.defer();
        var reader = new FileReader();
        reader.onload = function(event) {
            var data = event.target.result;
            //_log = JSON.parse(data);
            _log = data;
            // callback(_log);
            defer.resolve(_log);
        }
        reader.readAsText(file);
        return defer.promise;
    }
});


//create the main controller
demo_app.controller('MainController', ['$scope',  "LogLoadService",
    function($scope, LogLoadService) {
        //vars
        var globalString = "";
        var dataArray = new Array();
        var nameArray = new Array();
        var propertyArray = new Array();
        var idRecordArray = new Array();
        var appearArray = new Array();
        var modeArray = new Array();
        var modeTypeArray = new Array();
        var subjects = new Array();
        var nodeChecked, chart;
        var zNodes = [];

        $scope.init = function() {
            /*doc here:https://github.com/malihu/malihu-custom-scrollbar-plugin/releases
            http://manos.malihu.gr/repository/custom-scrollbar/demo/examples/scrollbar_themes_demo.html
            */
            $('#TreePart').mCustomScrollbar( {
                theme: "dark-thick"
            });
            $('#ChartPart').mCustomScrollbar( {
                theme: "dark-thick"
            });
        }

        // added methods
        $scope.Toggle = function() {
            var searchName = $("#search").val().split("-");
            var nameID = _.indexOf(nameArray, searchName[0]);
            var propertyID = _.indexOf(propertyArray[nameID], searchName[1]);
            var searchID = nameID * 100 + propertyID + 1;
            var zTree = $.fn.zTree.getZTreeObj("tree");
            var toClickNode = zTree.getNodeByParam("id", searchID);
            if (toClickNode.checked) {
                zTree.checkNode(toClickNode, false, false, true);
            }
            else zTree.checkNode(toClickNode, true, false, true);
        }   

        //private methods
        var storeInformation = function(globalString) {
            var message = globalString.split("\n");
            var i, j, counter;
            // i<message.length-1: because there is an empty line at the bottom of the flight log (annoying things...) If there are more than one empty line at last, code needs to be changed
            for (i = 0; i < message.length - 1; i++) {
                // eliminate all the annoying space
                var temp = message[i].replace(/\s/g, "");
                var element = temp.split(",");
                // gather the format
                // the condition that FMT+FMT is not considered
                if (element[0] == "FMT") {
                    if (!_.contains(nameArray, element[3])) {
                        nameArray.push(element[3]);
                        // collect the sub-properties of this property
                        propertyArray[nameArray.length-1] = [];
                        for (j = 0; j < element.length-5; j++) {
                            propertyArray[nameArray.length-1][j] = element[j+5];
                        }
                        dataArray[nameArray.length-1] = [];
                        for (j = 0; j < propertyArray[nameArray.length-1].length; j++) {
                            dataArray[nameArray.length-1][j] = [];
                        }
                    }
                }
                // the string in MODE is considered indenpendently
                else if (element[0] != "PARM" && element[0] != "MSG" && element[0] != "MODE") {
                    var nameIndex = _.indexOf(nameArray, element[0]);
                    if (!_.contains(appearArray, nameIndex)) {
                        appearArray.push(nameIndex);
                    }
                    for (var m = 0; m < propertyArray[nameIndex].length; m++) {
                        dataArray[nameIndex][m].push(parseFloat(element[m+1]));
                    }
                }
                else if (element[0] == "PARM") {
                    var nameIndex = _.indexOf(nameArray, element[0]);
                    if (!_.contains(appearArray, nameIndex)) {
                        appearArray.push(nameIndex);
                    }
                    dataArray[nameIndex][0].push(parseFloat(element[1]));
                    dataArray[nameIndex][2].push(parseFloat(element[3]));
                }
                else if (element[0] == "MODE") {
                    var nameIndex = _.indexOf(nameArray, element[0]);
                    if (!_.contains(appearArray, nameIndex)) {
                        appearArray.push(nameIndex);
                    }
                    for (var m = 0; m < 4; m++) {
                        if (m != 1) dataArray[nameIndex][m].push(parseFloat(element[m+1]));
                        else {
                            modeArray.push(element[2]);
                            if (!_.contains(modeTypeArray, element[2]))
                                modeTypeArray.push(element[2]);
                        }
                    }
                }
            }
            return true;
            //alert("finish information");
        }
        var zTreeOnCheck = function(event, treeId, treeNode) {
            console.log(treeNode)
            var changeId = treeNode.id;
            var zTree = $.fn.zTree.getZTreeObj("tree");
            nodeChecked = zTree.getNodeByParam("id",changeId);
            node_check(nodeChecked);
            //$("#showChart").click();
        };
        
        var setting = {
            callback: {
                onCheck: zTreeOnCheck
            },
            check: {
                enable: true,
                nocheckInherit: false
            },
            data: {
                simpleData: {
                    enable: true,
                    idKey: "id",
                    pIdKey: "pId",
                    rootPId: -1
                }
            },
            view: {
                showIcon: false
            }
        };
        var show_tree = function(){
            let count = 0;
            for (var i = 0; i < nameArray.length; i++) {
                if (!_.contains(appearArray,i)) continue;
                zNodes[count++] = {id:i, pId:-1, name:nameArray[i], nocheck:true};
                for (var j = 0; j < propertyArray[i].length; j++) {
                    zNodes[count++] = {id:j+i*100+1, pId:i, name:propertyArray[i][j]};
                    idRecordArray[idRecordArray.length] = j+i*100+1;
                    // record subjects for the search box
                    subjects.push(nameArray[i] + '-' + propertyArray[i][j]);
                }
            }
            $.fn.zTree.init($("#tree"), setting, zNodes);
            //alert("finish tree"); 
        };

        var show_image = function(){
            chart = new Highcharts.chart('myChart', {
            title: {
                text: 'Flight Log'   
            },
            xAxis: {
                labels: {enabled: false}
            },
            yAxis: {
                plotLines: [{
                    value: 0,
                    width: 1,
                    color: '#808080'
                }]
            },       
            legend: {
                layout: 'vertical',
                align: 'right',
                verticalAlign: 'middle',
                borderWidth: 0,
                enable: false
            },
            credits: {enabled: false}, 
            plotOptions: {
                series:{
                    marker: {enabled: false},
                    animation: false
                }
            },
            series: []
            });
        }

        var node_check = function(nodeChecked) {
            console.log(nodeChecked);
            //TODO: your logic
            if (nodeChecked.checked) {
                    var temppId = nodeChecked.pId;
                    var tempid = _.indexOf(propertyArray[temppId],nodeChecked.name);
                    chart.addSeries({
                        name: nameArray[temppId]+"--"+propertyArray[temppId][tempid],
                        data: dataArray[temppId][tempid],
                        id: nodeChecked.id
                    });
                }
                else {
                    var seriesToDelete = chart.get(nodeChecked.id);
                    seriesToDelete.remove();
                }

        }
        var show_search = function(subjects) {
            $('#search').typeahead({source: subjects});
            console.log(subjects.length);
        }
        //scope methods
        $scope.load_file = function(event) {
            console.log('loading file');
            var file = event.target.files[0];
            LogLoadService.loadLogFile(file)
            .then( function(log) {//first load the file
                return storeInformation(log);
            })
            .then( function(success) {//things to do after loading the file
                console.log('log extract status: ' + success);
                show_tree();
                show_image();
            })
            .then( function() {
                show_search(subjects);
            })
        }
    }
]);