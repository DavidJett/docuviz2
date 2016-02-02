var $ = jQuery.noConflict();

// "Array.prototype" allows us to add aditional methods to the Array object. Here we add "insert" and "delete" methods

// "insert" method lets us add an element at any index
// e.g.
// [a,b,d].insert('c', 2); // [a,b,c,d]
Array.prototype.insert = function(element, index) {
    this.splice(index, 0, element);
}

// "remove" method lets us remove elements within index range
// e.g.
// [a,b,c,d].remove(0, 2); // [d]
Array.prototype.delete = function(startIndex, endIndex) {
    return this.splice(startIndex, (endIndex - startIndex) + 1);
}


String.prototype.insert = function(index, string) {
    if (index > 0)
        return this.substring(0, index) + string + this.substring(index, this.length);
    else
        return string + this;
}


// If authorviz is already exist, use it. Otherwise make a new object
window.docuviz = window.docuviz || {}

$.extend(window.docuviz, {

    // "str" stores all the Character objects from a Google Doc
    str: [],
    allSegmentsInCurrentRev: [],
    firstRevisionSegments: [],
    segmentsArray: [],
    revID: 0,
    currentSegID: 0,

    renderToString: function(chars) {
        return _.reduce(chars, function(memo, obj) {
            if (obj.s === "\n") {
                return memo + "\n";
            } else {
                return memo + obj.s;
            }

        }, '');
    },

    // constructSegmentForFrontend is the actual segment that will be passed to the View, it only contains the information needed
    // to draw Docuviz 
    constructSegmentForFrontend: function(authorColor, segID, parentSegID, offset, segStr, segLength, revID) {
        return {
            authorColor: authorColor,
            segID: segID,
            parentSegID: parentSegID,
            offset: offset,
            segStr: segStr,
            segLength: segLength,
            revID: revID
        };
    },

    // constructSegment is a segment object that has more information for constructing inside model.js 
    constructSegment: function(authorId, segStr, segID, parentSegID, offset, revID, startIndex, endIndex, type, permanentFlag) {
        return {
            authorId: authorId,
            segStr: segStr,
            segID: segID,
            parentSegID: parentSegID,
            offset: offset,
            revID: revID,
            startIndex: startIndex,
            endIndex: endIndex,
            type: type,
            permanentFlag: permanentFlag
        };
    },

    analyzeEachEditInChangelog: function(entry, authorId, currentRevID, currentSegID, segsInFirstRev) {
        var that = this,
            type = entry.ty,
            insertStartIndex = null,
            deleteStartIndex = null,
            deleteEndIndex = null;

        if (type === 'mlti') {
            _.each(entry.mts, function(ent) {
                that.analyzeEachEditInChangelog(ent, authorId, currentRevID, currentSegID, segsInFirstRev);
            });
        } else if (type === 'rplc') {
            _.each(entry.snapshot, function(ent) {
                that.analyzeEachEditInChangelog(ent, authorId, currentRevID, currentSegID, segsInFirstRev);
            });

        } else if (type === 'rvrt') {
            that.str = [];
            that.allSegmentsInCurrentRev = [];
            _.each(entry.snapshot, function(ent) {
                that.analyzeEachEditInChangelog(ent, authorId, currentRevID, currentSegID, segsInFirstRev);
            });

        } else if (type === 'is' || type === 'iss') {

        	/*
            // the first rev
            if (segsInFirstRev.length === 0) {
                insertStartIndex = entry.ibi - 1;
                _.each(entry.s, function(character, index) {
                    var charObj = {
                        s: character,
                        aid: authorId
                    };

                    that.str.insert(charObj, insertStartIndex + index);
                });

            }

            // calculating the second and following revs
            else {
                insertStartIndex = entry.ibi - 1;
                if (that.firstRevisionSegments.length > 0) {
                    that.allSegmentsInCurrentRev = that.buildSegmentsWhenInsert(entry.s, insertStartIndex, authorId, that.firstRevisionSegments);
                    that.firstRevisionSegments = [];

                } else {
                    that.allSegmentsInCurrentRev = that.buildSegmentsWhenInsert(entry.s, insertStartIndex, authorId, that.allSegmentsInCurrentRev);

                }


                _.each(entry.s, function(character, index) {
                    var charObj = {
                        s: character,
                        aid: authorId
                    };
                    that.str.insert(charObj, insertStartIndex  + index);
                });
            }
            */
            insertStartIndex = entry.ibi - 1;
            that.allSegmentsInCurrentRev = that.buildSegmentsWhenInsert(entry.s, insertStartIndex, authorId, that.allSegmentsInCurrentRev);
            _.each(entry.s, function(character, index) {
                var charObj = {
                    s: character,
                    aid: authorId
                };
                that.str.insert(charObj, insertStartIndex  + index);
            });


        } else if (type === 'ds' || type === 'dss') {
        	/*
            // the first rev
            if (segsInFirstRev.length === 0 && that.revID === 0) {
                deleteStartIndex = entry.si - 1;
                deleteEndIndex = entry.ei - 1;
                that.str.delete(deleteStartIndex, deleteEndIndex);
            }

            // calculating the second and following revs, using the segs in previous rev
            else {
                deleteStartIndex = entry.si - 1;
                deleteEndIndex = entry.ei - 1;
                that.str.delete(deleteStartIndex, deleteEndIndex);

                if (that.firstRevisionSegments.length > 0) {
                    that.allSegmentsInCurrentRev = that.buildSegmentsWhenDelete(deleteStartIndex, deleteEndIndex, authorId, that.firstRevisionSegments);
                    that.firstRevisionSegments = [];

                } else {
                    that.allSegmentsInCurrentRev = that.buildSegmentsWhenDelete(deleteStartIndex, deleteEndIndex, authorId, that.allSegmentsInCurrentRev);
                }

            }
            */
            deleteStartIndex = entry.si - 1;
            deleteEndIndex = entry.ei - 1;
            that.str.delete(deleteStartIndex, deleteEndIndex);
            that.allSegmentsInCurrentRev = that.buildSegmentsWhenDelete(deleteStartIndex, deleteEndIndex, authorId, that.allSegmentsInCurrentRev);
        }
        else {
        	// all other types such as AS (formatting)
        }

        return true;
    },

    // calculate the revision's contributions Nov 02, 2015 by Kenny
    calculateRevContribution: function(revisionData, authors) {
        var newRevisionData = [];
        _.each(revisionData, function(eachRevision){
            var revContribution = []
            _.each(authors, function(eachAuthor){
                var sum = 0;
                _.each(eachRevision[3], function(eachSegment){
                    if (eachAuthor.color === eachSegment.authorColor){
                        sum += eachSegment.segLength;
                    }
                });
                revContribution.push({author: eachAuthor, contributionLength: sum});
            });

            eachRevision.push(revContribution);
            newRevisionData.push(eachRevision);
        });

        return newRevisionData;
    },

    buildRevisions: function(vizType, docId, changelog, authors, revTimestamps, revAuthors) {
        // Clear previous revision data
        this.str = [];
        this.firstRevisionSegments = [];
        this.currentSegID = 0;
        this.revID = 0;
        this.allSegmentsInCurrentRev = [];
        this.segmentsArray = [];

        var that = this,
            soFar = 0,
            editCount = changelog.length,
            html = '',
            command = null,
            authorId = null,
            revsForFrontend = [],
            //currentRevID = 0,
            //segsInFirstRev = null,
            differentAuthor = null;

        // an array of the cutting index of edits, e.g., [0,21,32] meaning: rev0 has 0, rev1 has 1-21, rev2 has 22-32
        var intervalChangesIndex = [];
        intervalChangesIndex = this.calculateIntervalChangesIndex(changelog, revTimestamps);
        if(intervalChangesIndex.length === 0) {
        	// Something is wrong, we didn't get changelog, or the cutting point
        	console.log("Check point 1");
        }

        // Async run through each entry in a synchronous sequence.
        async.eachSeries(changelog, function(entry, callBack) {
            authorId = entry[2],
            command = entry[0];

            // Find author object based on authorId:

            var currentAuthor = _.find(authors, function(eachAuthor) {
                return eachAuthor.id === authorId;
            });


            // Retrieve the Google Doc Tab and send a message to that Tab's view
            chrome.tabs.query({
                url: '*://docs.google.com/*/' + docId + '/edit*'
            }, function(tabs) {

                chrome.tabs.sendMessage(tabs[0].id, {
                    msg: 'progress',
                    soFar: soFar + 1
                }, function(response) {

                    that.analyzeEachEditInChangelog(command, authorId, that.revID, that.currentSegID, that.allSegmentsInCurrentRev);                    

                    if (soFar === intervalChangesIndex[that.revID] ) {
                    	/**
                        // at the cutting point, first revision
                        if (that.revID === 0) {
                        	
                        	// addressing the empty first segment situation
                        	var revLength = that.str.length;
                        	if (revLength != 0){
                        		var endIndex = revLength - 1;
                        	}
                        	else{
                        		var endIndex = 0;
                        	}
                        	
                        	// constructSegment(authorId, segStr, segId, parentSegId, offset, revId, startIndex, endIndex, type//notes for developing, permanentFlag//true or false);
                        	
                            that.firstRevisionSegments.push(that.constructSegment(authorId, that.renderToString(that.str), that.currentSegID, that.currentSegID, 0, that.revID, 0, endIndex, '', true));
                            //BUG: it can only handle 1 author & 1 segment in the first revision
                            
                            var segmentsForFrontend = that.buildSegmentsForOneRevision(that.firstRevisionSegments, authors);
                            revsForFrontend.push([revLength, revTimestamps[that.revID], revAuthors[that.revID], segmentsForFrontend]);
                        }

                        // cutting points, other revisions
                        else {
                            //var tempSegments = [];
                            

                            // change all segments'revID to the same revID
                            _.each(that.allSegmentsInCurrentRev, function(eachSegment) {
                                eachSegment.revID = that.revID;
                                eachSegment.permanentFlag = true;
                                //tempSegments.push(eachSegment);

                            });

                            //that.allSegmentsInCurrentRev = tempSegments;

                            var revLength = that.str.length;
                            // convert every segments into constructSegmentForFrontend object:
                            var segmentsForFrontend = that.buildSegmentsForOneRevision(that.allSegmentsInCurrentRev, authors);

                            revsForFrontend.push([revLength, revTimestamps[that.revID], revAuthors[that.revID], segmentsForFrontend]);
                        }
                        */

                        // change all segments'revID to the same revID
                        _.each(that.allSegmentsInCurrentRev, function(eachSegment) {
                            eachSegment.revID = that.revID;
                            eachSegment.permanentFlag = true;
                        });

                        var revLength = that.str.length;
                        // convert every segments into constructSegmentForFrontend object:
                        var segmentsForFrontend = that.buildSegmentsForOneRevision(that.allSegmentsInCurrentRev, authors);

                        revsForFrontend.push([revLength, revTimestamps[that.revID], revAuthors[that.revID], segmentsForFrontend]);

                        // update the current revision id
                        that.revID += 1;


                    } else {
                        

                    }


                    // reaching the end of changelog, calculate the contributions and push it to frontend
                    if (soFar === editCount ) {
                    	// calculate the revision's contributions, edit Nov 02, 2015 by Kenny
                    	var revDataWithContribution = that.calculateRevContribution(revsForFrontend, authors);

                    	chrome.tabs.query({
                    	    url: '*://docs.google.com/*/' + docId + '/edit*'
                    	}, function(tabs) {
                    	    chrome.tabs.sendMessage(tabs[0].id, {
                    	        msg: 'renderDocuviz',
                    	        chars: that.str,
                    	        // calculate the revision's contributions, edit Nov 02, 2015 by Kenny
                    	        revData: revDataWithContribution
                    	    }, function(response) {});
                    	});
                    }
                    // not finishing
                    else{

                    }

                    // update soFar
                    soFar += 1;

                    // Callback lets async knows that the sequence is finished can it can start run another entry           
                    callBack();
                    
                }
                );
				// End of chrome.tabs.sendMessage function
            });
			// End of chrome.tabs.query function.
        });
		// End of async
    },

    // // need to change this to findBeginAndEndIndexOfSegsHelper
    // findBeginAndEndIndexesOfSegsHelper: function(locationBasedOnLength, segment) {
    //     return {
    //         locationBasedOnLength: locationBasedOnLength, // [begin index of seg, end index of seg]
    //         segment: segment // "Construct Segment" object
    //     };
    // },

    // // this function takes the current segments array and return aan array of an
    // // object that contains: {{[begin index of seg, endindex of seg],[segment]},...}
    // findBeginAndEndIndexesOfSegs: function(segmentsArray) {
    //     var segsArray = [];
    //     var locationSoFar = 0;
    //     var that = this;
    //     for (var i = 0; i < segmentsArray.length; i++) {

    //         if (i === 0) {
    //         	var endIndex = 0;
    //         	if (segmentsArray[i].segStr.length > 0){
    //         		endIndex = segmentsArray[i].segStr.length - 1;
    //         	}

    //             segsArray.push(that.findBeginAndEndIndexesOfSegsHelper([0, endIndex], segmentsArray[i]));
    //         } else {
    //         	var endIndex = 0;
    //         	if (segsArray[locationSoFar].locationBasedOnLength[1] + segmentsArray[i].segStr.length > 0){
    //         		endIndex = segsArray[locationSoFar].locationBasedOnLength[1] + segmentsArray[i].segStr.length - 1;
    //         	}

    //             segsArray.push(that.findBeginAndEndIndexesOfSegsHelper([segsArray[locationSoFar].locationBasedOnLength[1] , endIndex], segmentsArray[i]));
    //             locationSoFar += 1;
    //         };
    //     };

    //     return segsArray;
    // },


    // Creating the new segment, breaking the effected old segment if necessary, and updating all the following startIndex and endIndex
    buildSegmentsWhenInsert: function(entry, startIndex, authorId, segmentsArray) {

        var that = this;

        var effectedSegment = null;
        var segmentLocation = null;

        if(segmentsArray != null){
	        effectedSegment = _.find(segmentsArray, function(eachSegment, index) {
	        	if (eachSegment.startIndex < startIndex && startIndex <= eachSegment.endIndex) {
	                segmentLocation = index;
	                return eachSegment;
	            }
	            else if (startIndex === eachSegment.startIndex) {
	            	if (segmentsArray[index-1].permanentFlag === true){
	            		segmentLocation = index;
	            		return eachSegment;
	            	}
	            	else if ( (segmentsArray[index-1].permanentFlag === false) && (segmentsArray[index-1].authorId != authorId) ){
	            		segmentLocation = index;
	            		return eachSegment;
	            	}
	            	else if ( (segmentsArray[index-1].permanentFlag === false) && (segmentsArray[index-1].authorId === authorId) ) {
	            		segmentLocation = (index - 1);
	            		return segmentsArray[index-1];
	            	}
	            	else {
	            		// will never happen
	            	}
	            	
	            } 
	            else {
	            	// do nothing, keep looking
	            }
	        });
		}

        // it should only happen if it's the first revision, first segment
        if (effectedSegment === undefined) {
            that.currentSegID += 1;
            var currentSeg = that.constructSegment(authorId, entry, that.currentSegID, that.currentSegID, 0, that.revID, startIndex, startIndex + entry.length - 1, "new segment because of no previous segment", false);
            segmentsArray.insert(currentSeg, 0);
        } 
        // found an effected segment, TODO all need to updates the startIndex and endIndex for each successive segments
        else {
        	// not the same author
            if (authorId != effectedSegment.authorId ) {
            	that.currentSegID += 1;
            	var currentSeg = that.constructSegment(authorId, entry, that.currentSegID, that.currentSegID, 0, that.revID, startIndex, startIndex + entry.length - 1, "new segment and found the effected segment", false);
            	
            	if(effectedSegment.startIndex === startIndex){
            		segmentsArray.insert(currentSeg, segmentLocation);

		    		for (var i = (segmentLocation + 1); i < segmentsArray.length; i++) {
				    	segmentsArray[i].startIndex += entry.length;
				    	segmentsArray[i].endIndex += entry.length;
		    		}
            	}
            	else if (startIndex === (effectedSegment.endIndex + 1)){
            		segmentsArray.insert(currentSeg, (segmentLocation+1) ); // BUG, what if it's the same author as in the next segment

		    		for (var i = (segmentLocation + 2); i < segmentsArray.length; i++) {
				    	segmentsArray[i].startIndex += entry.length;
				    	segmentsArray[i].endIndex += entry.length;
		    		}

            	}
            	else if (effectedSegment.startIndex < startIndex && startIndex <= effectedSegment.endIndex) {

            		var strBeforeStartIndex = effectedSegment.segStr.substring(0, startIndex - effectedSegment.startIndex);
            		var strAfterStartIndex = effectedSegment.segStr.substring(startIndex - effectedSegment.startIndex);

            		// if (strBeforeStartIndex.length > 0) {

        		    segmentsArray.delete(segmentLocation, segmentLocation);

        		    that.currentSegID += 1;
        		    if (effectedSegment.permanentFlag === true) {
        		        var segBefore = that.constructSegment(effectedSegment.authorId, strBeforeStartIndex, that.currentSegID, effectedSegment.segID, 0, that.revID, effectedSegment.startIndex, (startIndex - 1), "from buildSegmentsWhenInsert Before, authorId !=  effectedSegment.authorId, when permanentFlag = true", false);
        		    } else {
        		        var segBefore = that.constructSegment(effectedSegment.authorId, strBeforeStartIndex, that.currentSegID, effectedSegment.parentSegID, effectedSegment.offset, that.revID, effectedSegment.startIndex, (startIndex - 1), "from buildSegmentsWhenInsert Before, authorId !=  effectedSegment.authorId, when permanentFlag = false", false);
        		    }

        		    segmentsArray.insert(segBefore, segmentLocation)
            		   
            		segmentsArray.insert(currentSeg, (segmentLocation + 1) );
        		    
        		    that.currentSegID += 1;

        		    var offset = startIndex - effectedSegment.startIndex;


    		        if (effectedSegment.permanentFlag === true) {
    		            var segAfter = that.constructSegment(effectedSegment.authorId, strAfterStartIndex, that.currentSegID, effectedSegment.segID, offset, that.revID, (startIndex + entry.length ), (effectedSegment.endIndex + entry.length), "from buildSegmentsWhenInsert After,  authorId !=  effectedSegment.authorId, when permanentFlag = true", false);
    		        } else {
    		            var segAfter = that.constructSegment(effectedSegment.authorId, strAfterStartIndex, that.currentSegID, effectedSegment.parentSegID, offset + effectedSegment.offset, that.revID, (startIndex + entry.length), (effectedSegment.endIndex + entry.length), "from buildSegmentsWhenInsert After, in authorId !=  effectedSegment.authorId when permanentFlag = false", false);
    		        }
    		        segmentsArray.insert(segAfter, (segmentLocation + 2) );

            		for (var i = (segmentLocation + 3); i < segmentsArray.length; i++) {
        		    	segmentsArray[i].startIndex += entry.length;
        		    	segmentsArray[i].endIndex += entry.length;
            		}

            	}
            	else{
            		// shouldn't happen
            	}
            }
            // when author === effectedSegment.segment.author
            else { 
	        	if(effectedSegment.startIndex === startIndex){
	        		if (effectedSegment.permanentFlag === true) {
	        		    that.currentSegID += 1;
	        		    var currentSeg = that.constructSegment(authorId, entry, that.currentSegID, that.currentSegID, 0, that.revID, startIndex, (startIndex + entry.length - 1), "new segment and found the effected segment", false);
	        		    segmentsArray.insert(currentSeg, segmentLocation );
	        		} else {
	        			effectedSegment.segStr.insert(0, entry);
	        			effectedSegment.endIndex += entry.length;
	        		}
		    		for (var i = (segmentLocation + 1); i < segmentsArray.length; i++) {
				    	segmentsArray[i].startIndex += entry.length;
				    	segmentsArray[i].endIndex += entry.length;
		    		}
	        	}
	        	else if (startIndex === (effectedSegment.endIndex + 1)){
	        		if (effectedSegment.permanentFlag === true) {
	        		    that.currentSegID += 1;
	        		    var currentSeg = that.constructSegment(authorId, entry, that.currentSegID, that.currentSegID, 0, that.revID, startIndex, (startIndex + entry.length - 1), "new segment and found the effected segment", false);
	        		    segmentsArray.insert(currentSeg, (segmentLocation + 1) );

		        		for (var i = (segmentLocation + 2); i < segmentsArray.length; i++) {
		    		    	segmentsArray[i].startIndex += entry.length;
		    		    	segmentsArray[i].endIndex += entry.length;
		        		}

	        		} else {
	        			effectedSegment.segStr.insert(effectedSegment.segStr.length, entry);
	        			effectedSegment.endIndex += entry.length;

			    		for (var i = (segmentLocation + 1); i < segmentsArray.length; i++) {
					    	segmentsArray[i].startIndex += entry.length;
					    	segmentsArray[i].endIndex += entry.length;
			    		}
	        		}
	        	}
	        	else if (effectedSegment.startIndex < startIndex && startIndex <= effectedSegment.endIndex) {
	        		if (effectedSegment.permanentFlag === true) {
	            		var strBeforeStartIndex = effectedSegment.segStr.substring(0, startIndex - effectedSegment.startIndex);
	            		var strAfterStartIndex = effectedSegment.segStr.substring(startIndex - effectedSegment.startIndex);

	        		    segmentsArray.delete(segmentLocation, segmentLocation);

	        		    that.currentSegID += 1;
	        		    var segBefore = that.constructSegment(effectedSegment.authorId, strBeforeStartIndex, that.currentSegID, effectedSegment.segID, 0, that.revID, effectedSegment.startIndex, (startIndex - 1), "from buildSegmentsWhenInsert Before, authorId !=  effectedSegment.authorId, when permanentFlag = true", false);
	        		    segmentsArray.insert(segBefore, segmentLocation)

	        		    that.currentSegID += 1;
	        		    var currentSeg = that.constructSegment(authorId, entry, that.currentSegID, that.currentSegID, 0, that.revID, startIndex, (startIndex + entry.length - 1), "new segment and found the effected segment", false);
	            		segmentsArray.insert(currentSeg, (segmentLocation + 1) );
	        		    
	        		    that.currentSegID += 1;
	        		    var offset = startIndex - effectedSegment.startIndex;
    		            var segAfter = that.constructSegment(effectedSegment.authorId, strAfterStartIndex, that.currentSegID, effectedSegment.segID, offset, that.revID, (startIndex + entry.length ), (effectedSegment.endIndex + entry.length), "from buildSegmentsWhenInsert After,  authorId !=  effectedSegment.authorId, when permanentFlag = true", false);
	    		        segmentsArray.insert(segAfter, (segmentLocation + 2) );

	            		for (var i = (segmentLocation + 3); i < segmentsArray.length; i++) {
	        		    	segmentsArray[i].startIndex += entry.length;
	        		    	segmentsArray[i].endIndex += entry.length;
	            		}

	        		} else {
	        			effectedSegment.segStr.insert( (startIndex - effectedSegment.startIndex), entry);
	        			effectedSegment.endIndex += entry.length;

			    		for (var i = (segmentLocation + 1); i < segmentsArray.length; i++) {
					    	segmentsArray[i].startIndex += entry.length;
					    	segmentsArray[i].endIndex += entry.length;
			    		}
	        		}
	        	}
	        	else {
	        		//shouldn't happend
	        	}
            }
        }

        return segmentsArray;

    },


    buildSegmentsWhenDelete: function(deleteStartIndex, deleteEndIndex, author, segmentsArray) {
        var that = this;

        // var deleteSegmentLocation = null;
        var effectedSegmentOfDelete = null;

        // delete start === delete end, only deleting 1 character
        if (deleteStartIndex === deleteEndIndex) {

            var deleteIndex = deleteStartIndex;

            if(segmentsArray != null){

                effectedSegmentOfDelete = _.find(segmentsArray, function(eachSegment, index) {
                    if (eachSegment.startIndex === deleteIndex ) {
                    	if (eachSegment.startIndex === eachSegment.endIndex) {
                    		// delete the whole segment
                    		segmentsArray.delete(index, index);
                    		
                    	}
                    	else{
                    		var strAfterDelete = eachSegment.segStr.substring(deleteIndex - eachSegment.startIndex + 1); // = substring(1)

                    		if (eachSegment.permanentFlag === true) {
	                    		// delete the old segment from current revision
	                    		segmentsArray.delete(index, index);

	                    		// create a new segment with offset
	                    		that.currentSegID += 1;
	                    		var segAfter  = constructSegment(eachSegment.authorId, strAfterDelete, that.currentSegID, eachSegment.segID, 1, that.revID, eachSegment.startIndex, (eachSegment.endIndex - 1), "", false);
	                    		segmentsArray.insert(segAfter, index);

                    		}
                    		else {
                    			segmentsArray[index].segStr = strAfterDelete;
                    			segmentsArray[index].endIndex -= 1;
                    		}

                    	}
                    	// updates all the following segments's start and end index
                    	for (var i = (index+1); i <= (segmentsArray.length-1); i++){
                    	    segmentsArray[i].startIndex -= 1;
                    	    segmentsArray[i].endIndex -= 1;
                    	}

                    	return eachSegment;
                    }
                    else if (eachSegment.endIndex === deleteIndex ){
                    	if (eachSegment.startIndex === eachSegment.endIndex) {
                    		// delete the whole segment
                    		segmentsArray.delete(index, index);
                    		
                    	}
                    	else{
                    		var strBeforeDelete = eachSegment.segStr.substring(0, (deleteIndex - eachSegment.startIndex)); // = substring(0,end-1)

                    		if (eachSegment.permanentFlag === true) {
	                    		// delete the old segment from current revision
	                    		segmentsArray.delete(index, index);

	                    		// create a new segment with offset
	                    		that.currentSegID += 1;
	                    		var segBefore  = constructSegment(eachSegment.authorId, strBeforeDelete, that.currentSegID, eachSegment.segID, 0, that.revID, eachSegment.startIndex, (eachSegment.endIndex - 1), "", false);
	                    		segmentsArray.insert(segBefore, index);

                    		}
                    		else {
                    			segmentsArray[index].segStr = strBeforeDelete;
                    			segmentsArray[index].endIndex -= 1;
                    		}

                    	}
                    	// updates all the following segments's start and end index
                    	for (var i = (index+1); i <= (segmentsArray.length-1); i++){
                    	    segmentsArray[i].startIndex -= 1;
                    	    segmentsArray[i].endIndex -= 1;
                    	}

                    	return eachSegment;

                    }
                    else if (eachSegment.startIndex < deleteIndex && deleteIndex < eachSegment.endIndex){
                		var strBeforeDelete = eachSegment.segStr.substring(0, (deleteIndex - eachSegment.startIndex)); // = substring(0,end-1)
                		var strAfterDelete = eachSegment.segStr.substring(deleteIndex - eachSegment.startIndex + 1); // = substring(1)

                		if (eachSegment.permanentFlag === true) {
                    		// delete the old segment from current revision
                    		segmentsArray.delete(index, index);

                    		// create two new segments, one with offset 0, another with offeset 
                    		that.currentSegID += 1;
                    		var segBefore  = constructSegment(eachSegment.authorId, strBeforeDelete, that.currentSegID, eachSegment.segID, 0, that.revID, eachSegment.startIndex, (deleteIndex - 1), "", false);
                    		segmentsArray.insert(segBefore, index);

                    		// create a new segment with offset
                    		that.currentSegID += 1;
                    		var segAfter  = constructSegment(eachSegment.authorId, strAfterDelete, that.currentSegID, eachSegment.segID, (deleteIndex + 1 ), that.revID, deleteIndex, (eachSegment.endIndex - 1), "", false);
                    		segmentsArray.insert(segAfter, (index+1) );

                    		// updates all the following segments
                    		for (var i = (index+2); i <= (segmentsArray.length-1); i++){
                    		    segmentsArray[i].startIndex -= 1;
                    		    segmentsArray[i].endIndex -= 1;
                    		}

                		}
                		else {
                			segmentsArray[index].segStr = strBeforeDelete + strAfterDelete;
                			segmentsArray[index].endIndex -= 1;

                			// updates all the following segments
                			for (var i = (index+1); i <= (segmentsArray.length-1); i++){
                			    segmentsArray[i].startIndex -= 1;
                			    segmentsArray[i].endIndex -= 1;
                			}
                		}
                    	return eachSegment;

                    }
                    else {
                        // do nothing, keep looking
                    }

                });
                
                if (effectedSegmentOfDelete === undefined){ 
                    console.log("shouldn't happend, effectedSegmentOfDelete is undefined, buildSegmentsWhenDelete when deleteStartIndex === deleteEndIndex");
                }

            }

            else{
                console.log("This should never happen, segmentsArray is null,  buildSegmentsWhenDelete when deleteStartIndex === deleteEndIndex");
            }
        } 
        else { // when deleteStartIndex != deleteEndIndex

        	var deleteStartSegmentLocation = null;
        	var effectedSegmentOfDeleteStart = null;
        	var deleteEndSegmentLocation = null;
        	var effectedSegmentOfDeleteEnd = null;

        	if(segmentsArray != null ){
        		effectedSegmentOfDeleteStart = _.find(segmentsArray, function(eachSegment, index) {
        		    if (eachSegment.startIndex <= deleteStartIndex && deleteStartIndex <= eachSegment.endIndex) {
        		        deleteStartSegmentLocation = index;
        		        return eachSegment;
        		    }
        		        
        		    
        		    else {
        		        // do nothing, keep looking
        		    }
        		});


        		effectedSegmentOfDeleteEnd = _.find(segmentsArray, function(eachSegment, index) {
        		    if (eachSegment.startIndex <= deleteEndIndex && deleteEndIndex <= eachSegment.endIndex) {
        		        deleteEndSegmentLocation = index;
        		        return eachSegment;
        		    }
        		        
        		    else {
        		        // do nothing, keep looking
        		    }
        		});

        		// within a segment
        		if (deleteStartSegmentLocation === deleteEndSegmentLocation) {
        			
        			if(deleteStartIndex > effectedSegmentOfDeleteStart.startIndex && deleteEndIndex < effectedSegmentOfDeleteStart.endIndex){
						var strBeforeDelete = effectedSegmentOfDeleteStart.segStr.substring(0, (deleteStartIndex - effectedSegmentOfDeleteStart.startIndex)); // = substring(0,end-1)
						var strAfterDelete = effectedSegmentOfDeleteStart.segStr.substring(deleteEndIndex - effectedSegmentOfDeleteStart.startIndex + 1); // = substring(1)

						if (effectedSegmentOfDeleteStart.permanentFlag === true) {
				    		// delete the old segment from current revision
				    		segmentsArray.delete(deleteStartSegmentLocation, deleteStartSegmentLocation);

				    		// create two new segments, one with offset 0, another with offeset 
				    		that.currentSegID += 1;
				    		var segBefore  = constructSegment(effectedSegmentOfDeleteStart.authorId, strBeforeDelete, that.currentSegID, effectedSegmentOfDeleteStart.segID, 0, that.revID, effectedSegmentOfDeleteStart.startIndex, (deleteStartIndex - 1), "", false);
				    		segmentsArray.insert(segBefore, deleteStartSegmentLocation);

				    		// create a new segment with offset
				    		that.currentSegID += 1;
				    		var segAfter  = constructSegment(effectedSegmentOfDeleteStart.authorId, strAfterDelete, that.currentSegID, effectedSegmentOfDeleteStart.segID, (deleteEndIndex - effectedSegmentOfDeleteStart.startIndex + 1 ), that.revID, deleteStartIndex, (effectedSegmentOfDeleteStart.endIndex - 1 - deleteEndIndex + deleteStartIndex), "", false);
				    		segmentsArray.insert(segAfter, (deleteStartSegmentLocation+1) );

				    		// updates all the following segments
				    		for (var i = (deleteStartSegmentLocation+2); i <= (segmentsArray.length-1); i++){
				    		    segmentsArray[i].startIndex -= (deleteEndIndex - deleteStartIndex + 1 );
				    		    segmentsArray[i].endIndex -= (deleteEndIndex - deleteStartIndex + 1 );
				    		}

						}
						else {
							segmentsArray[deleteStartSegmentLocation].segStr = strBeforeDelete + strAfterDelete;
							segmentsArray[deleteStartSegmentLocation].endIndex -= (deleteEndIndex - deleteStartIndex + 1 );

							// updates all the following segments
							for (var i = (deleteStartSegmentLocation+1); i <= (segmentsArray.length-1); i++){
							    segmentsArray[i].startIndex -= (deleteEndIndex - deleteStartIndex + 1 );
							    segmentsArray[i].endIndex -= (deleteEndIndex - deleteStartIndex + 1 );
							}
						}
        			}
        			else if (deleteStartIndex === effectedSegmentOfDeleteStart.startIndex && deleteEndIndex < effectedSegmentOfDeleteStart.endIndex){
						var strAfterDelete = effectedSegmentOfDeleteStart.segStr.substring(deleteEndIndex - effectedSegmentOfDeleteStart.startIndex + 1); // = substring(1)

						if (effectedSegmentOfDeleteStart.permanentFlag === true) {
				    		// delete the old segment from current revision
				    		segmentsArray.delete(deleteStartSegmentLocation, deleteStartSegmentLocation);

				    		// create a new segment with offset
				    		that.currentSegID += 1;
				    		var segAfter  = constructSegment(effectedSegmentOfDeleteStart.authorId, strAfterDelete, that.currentSegID, effectedSegmentOfDeleteStart.segID, (deleteEndIndex - effectedSegmentOfDeleteStart.startIndex + 1 ), that.revID, deleteStartIndex, (effectedSegmentOfDeleteStart.endIndex - 1 - deleteEndIndex + deleteStartIndex), "", false);
				    		segmentsArray.insert(segAfter, (deleteStartSegmentLocation) );

				    		// updates all the following segments
				    		for (var i = (deleteStartSegmentLocation+1); i <= (segmentsArray.length-1); i++){
				    		    segmentsArray[i].startIndex -= (deleteEndIndex - deleteStartIndex + 1 );
				    		    segmentsArray[i].endIndex -= (deleteEndIndex - deleteStartIndex + 1 );
				    		}

						}
						else {
							segmentsArray[deleteStartSegmentLocation].segStr = strAfterDelete;
							segmentsArray[deleteStartSegmentLocation].endIndex -= (deleteEndIndex - deleteStartIndex + 1 );

							// updates all the following segments
							for (var i = (deleteStartSegmentLocation+1); i <= (segmentsArray.length-1); i++){
							    segmentsArray[i].startIndex -= (deleteEndIndex - deleteStartIndex + 1 );
							    segmentsArray[i].endIndex -= (deleteEndIndex - deleteStartIndex + 1 );
							}
						}
        			}
        			else if(deleteStartIndex > effectedSegmentOfDeleteStart.startIndex && deleteEndIndex === effectedSegmentOfDeleteStart.endIndex){
						var strBeforeDelete = effectedSegmentOfDeleteStart.segStr.substring(0, (deleteStartIndex - effectedSegmentOfDeleteStart.startIndex)); // = substring(0,end-1)
						
						if (effectedSegmentOfDeleteStart.permanentFlag === true) {
				    		// delete the old segment from current revision
				    		segmentsArray.delete(deleteStartSegmentLocation, deleteStartSegmentLocation);

				    		// create two new segments, one with offset 0, another with offeset 
				    		that.currentSegID += 1;
				    		var segBefore  = constructSegment(effectedSegmentOfDeleteStart.authorId, strBeforeDelete, that.currentSegID, effectedSegmentOfDeleteStart.segID, 0, that.revID, effectedSegmentOfDeleteStart.startIndex, (deleteStartIndex - 1), "", false);
				    		segmentsArray.insert(segBefore, deleteStartSegmentLocation);

				    		// updates all the following segments
				    		for (var i = (deleteStartSegmentLocation+1); i <= (segmentsArray.length-1); i++){
				    		    segmentsArray[i].startIndex -= (deleteEndIndex - deleteStartIndex + 1 );
				    		    segmentsArray[i].endIndex -= (deleteEndIndex - deleteStartIndex + 1 );
				    		}

						}
						else {
							segmentsArray[deleteStartSegmentLocation].segStr = strBeforeDelete;
							segmentsArray[deleteStartSegmentLocation].endIndex -= (deleteEndIndex - deleteStartIndex + 1 );

							// updates all the following segments
							for (var i = (deleteStartSegmentLocation+1); i <= (segmentsArray.length-1); i++){
							    segmentsArray[i].startIndex -= (deleteEndIndex - deleteStartIndex + 1 );
							    segmentsArray[i].endIndex -= (deleteEndIndex - deleteStartIndex + 1 );
							}
						}
        			}
        			else if (deleteStartIndex === effectedSegmentOfDeleteStart.startIndex && deleteEndIndex === effectedSegmentOfDeleteStart.endIndex){
        				segmentsArray.delete(deleteStartSegmentLocation, deleteStartSegmentLocation);
        				// updates all the following segments
        				for (var i = deleteStartSegmentLocation; i <= (segmentsArray.length-1); i++){
        				    segmentsArray[i].startIndex -= (deleteEndIndex - deleteStartIndex + 1 );
        				    segmentsArray[i].endIndex -= (deleteEndIndex - deleteStartIndex + 1 );
        				}
        			}
        			else {
        				console.log("shouldn't happen in buildSegmentsWhenDelete, deleteStartSegmentLocation === deleteEndSegmentLocation");
        			}

        		}
        		// not within a segment
        		else {
					var strBeforeDelete = effectedSegmentOfDeleteStart.segStr.substring(0, (deleteStartIndex - effectedSegmentOfDeleteStart.startIndex)); // = substring(0,end-1)
					var strAfterDelete = effectedSegmentOfDeleteEnd.segStr.substring(deleteEndIndex - effectedSegmentOfDeleteEnd.startIndex + 1); // = substring(1)

					if(deleteStartIndex > effectedSegmentOfDeleteStart.startIndex && deleteEndIndex < effectedSegmentOfDeleteEnd.endIndex){

						if (effectedSegmentOfDeleteStart.permanentFlag === true) {
				    		// delete the old segment from current revision
				    		segmentsArray.delete(deleteStartSegmentLocation, deleteStartSegmentLocation);

				    		// create a new segment, one with offset 0, another with offeset 
				    		that.currentSegID += 1;
				    		var segBefore  = constructSegment(effectedSegmentOfDeleteStart.authorId, strBeforeDelete, that.currentSegID, effectedSegmentOfDeleteStart.segID, 0, that.revID, effectedSegmentOfDeleteStart.startIndex, (deleteStartIndex - 1), "", false);
				    		segmentsArray.insert(segBefore, deleteStartSegmentLocation);

						}
						else {
							segmentsArray[deleteStartSegmentLocation].segStr = strBeforeDelete;
							segmentsArray[deleteStartSegmentLocation].endIndex = (deleteStartIndex -1 );

						}

						if (effectedSegmentOfDeleteEnd.permanentFlag === true) {
							// delete the old segment from current revision
							segmentsArray.delete(deleteEndSegmentLocation, deleteEndSegmentLocation);

				    		// create a new segment with offset
				    		that.currentSegID += 1;
				    		var segAfter  = constructSegment(effectedSegmentOfDeleteEnd.authorId, strAfterDelete, that.currentSegID, effectedSegmentOfDeleteEnd.segID, (effectedSegmentOfDeleteEnd - deleteEndIndex), that.revID, deleteStartIndex, (effectedSegmentOfDeleteEnd.endIndex - 1 - deleteEndIndex + deleteStartIndex), "", false);
				    		segmentsArray.insert(segAfter, deleteEndSegmentLocation );

						}
						else {
							segmentsArray[deleteEndSegmentLocation].segStr = strAfterDelete;
							segmentsArray[deleteEndSegmentLocation].startIndex = deleteStartIndex;
							segmentsArray[deleteEndSegmentLocation].endIndex = (effectedSegmentOfDeleteEnd.endIndex - 1 - deleteEndIndex + deleteStartIndex);
						}

						// updates all the following segments
						for (var i = (deleteEndSegmentLocation+1); i <= (segmentsArray.length-1); i++){
						    segmentsArray[i].startIndex -= (deleteEndIndex - deleteStartIndex + 1 );
						    segmentsArray[i].endIndex -= (deleteEndIndex - deleteStartIndex + 1 );
						}

						if (deleteEndSegmentLocation === (deleteStartSegmentLocation+1)){

						}
						else{
							segmentsArray.delete( (deleteStartSegmentLocation+1), (deleteEndSegmentLocation-1));
						}
					}

					else if (deleteStartIndex === effectedSegmentOfDeleteStart.startIndex && deleteEndIndex < effectedSegmentOfDeleteEnd.endIndex){

						// segmentsArray.delete(deleteStartSegmentLocation, deleteStartSegmentLocation);


						if (effectedSegmentOfDeleteEnd.permanentFlag === true) {
							// delete the old segment from current revision
							segmentsArray.delete(deleteEndSegmentLocation, deleteEndSegmentLocation);

				    		// create a new segment with offset
				    		that.currentSegID += 1;
				    		var segAfter  = constructSegment(effectedSegmentOfDeleteEnd.authorId, strAfterDelete, that.currentSegID, effectedSegmentOfDeleteEnd.segID, (effectedSegmentOfDeleteEnd - deleteEndIndex), that.revID, deleteStartIndex, (effectedSegmentOfDeleteEnd.endIndex - 1 - deleteEndIndex + deleteStartIndex), "", false);
				    		segmentsArray.insert(segAfter, deleteEndSegmentLocation );

						}
						else {
							segmentsArray[deleteEndSegmentLocation].segStr = strAfterDelete;
							segmentsArray[deleteEndSegmentLocation].startIndex = deleteStartIndex;
							segmentsArray[deleteEndSegmentLocation].endIndex = (effectedSegmentOfDeleteEnd.endIndex - 1 - deleteEndIndex + deleteStartIndex);
						}

						// updates all the following segments
						for (var i = (deleteEndSegmentLocation+1); i <= (segmentsArray.length-1); i++){
						    segmentsArray[i].startIndex -= (deleteEndIndex - deleteStartIndex + 1 );
						    segmentsArray[i].endIndex -= (deleteEndIndex - deleteStartIndex + 1 );
						}


						segmentsArray.delete( deleteStartSegmentLocation, (deleteEndSegmentLocation-1));
						
					}
					else if (deleteStartIndex > effectedSegmentOfDeleteStart.startIndex && deleteEndIndex === effectedSegmentOfDeleteEnd.endIndex){
						
						if (effectedSegmentOfDeleteStart.permanentFlag === true) {
				    		// delete the old segment from current revision
				    		segmentsArray.delete(deleteStartSegmentLocation, deleteStartSegmentLocation);

				    		// create a new segment, one with offset 0, another with offeset 
				    		that.currentSegID += 1;
				    		var segBefore  = constructSegment(effectedSegmentOfDeleteStart.authorId, strBeforeDelete, that.currentSegID, effectedSegmentOfDeleteStart.segID, 0, that.revID, effectedSegmentOfDeleteStart.startIndex, (deleteStartIndex - 1), "", false);
				    		segmentsArray.insert(segBefore, deleteStartSegmentLocation);

						}
						else {
							segmentsArray[deleteStartSegmentLocation].segStr = strBeforeDelete;
							segmentsArray[deleteStartSegmentLocation].endIndex = (deleteStartIndex -1 );

						}

						// updates all the following segments
						for (var i = (deleteEndSegmentLocation+1); i <= (segmentsArray.length-1); i++){
						    segmentsArray[i].startIndex -= (deleteEndIndex - deleteStartIndex + 1 );
						    segmentsArray[i].endIndex -= (deleteEndIndex - deleteStartIndex + 1 );
						}

						segmentsArray.delete( (deleteStartSegmentLocation+1), deleteEndSegmentLocation);
						
					}
					else if (deleteStartIndex === effectedSegmentOfDeleteStart.startIndex && deleteEndIndex === effectedSegmentOfDeleteEnd.endIndex){


						// updates all the following segments
						for (var i = (deleteEndSegmentLocation+1); i <= (segmentsArray.length-1); i++){
						    segmentsArray[i].startIndex -= (deleteEndIndex - deleteStartIndex + 1 );
						    segmentsArray[i].endIndex -= (deleteEndIndex - deleteStartIndex + 1 );
						}


						segmentsArray.delete( (deleteStartSegmentLocation), (deleteEndSegmentLocation));
						
					}
					else {
						console.log("This should never happen, segmentsArray is null,  buildSegmentsWhenDelete");
					}

        		}


        	}
        	else{
        	    console.log("This should never happen, segmentsArray is null,  buildSegmentsWhenDelete when deleteStartIndex === deleteEndIndex");
        	}
        }

        return segmentsArray;

    },

    // build the segments for frontend for a revision
    buildSegmentsForOneRevision: function(segmentsArray, authors) {
        var segments = [];
        var counter = 0;
        var that = this;
        
        _.each(segmentsArray, function(eachSegment) {

            var currentAuthor = _.find(authors, function(eachAuthor) {
                return eachAuthor.id === eachSegment.author;
            });
            if (currentAuthor === undefined) {
                var authorColor = "#7F7F7F";

            }
            else{
                var authorColor = currentAuthor.color;
            }

            var segment = that.constructSegmentForFrontend(authorColor, eachSegment.segID, eachSegment.parentSegID, eachSegment.offset, eachSegment.segStr, eachSegment.segStr.length, eachSegment.revID);
            segments.push(segment);
        });

        return segments;

    },

    calculateIntervalChangesIndex: function(logData, timeStamp) {
        var indexArray = [];
        var reducedlogData = _.map(logData, function(val) {
            return val[1];
        });

        _.each(timeStamp, function(val) {
            indexArray.push(_.indexOf(reducedlogData, val));
        });
        return indexArray;
    },
});


// Listen to message sent out from the View
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        switch (request.msg) {
            // If the message is 'changelog', run 'buildRevision'
            case 'changelog':
                window.docuviz.buildRevisions(request.vizType, request.docId, request.changelog, request.authors, request.revTimestamps, request.revAuthors);
                break;

            default:
        }
    });