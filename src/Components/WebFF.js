import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import { withRouter } from 'react-router-dom';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import SystemMenu from './SystemMenu.js';
import NavMenu from './NavMenu.js';
import Dashboard from './Dashboard.js';
import { styles } from '../style';
import 'typeface-roboto';
import {
	Route,
	Switch
} from 'react-router-dom';
import ErrorPage from './Errors/ErrorPage';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import { Link } from 'react-router-dom';
import ImportContactsIcon from '@material-ui/icons/ImportContacts';
import OpacityIcon from '@material-ui/icons/Opacity';
import DashboardIcon from '@material-ui/icons/Dashboard';
import ReorderIcon from '@material-ui/icons/Reorder';
import ColorizeIcon from '@material-ui/icons/Colorize';
import SettingsInputComponentIcon from '@material-ui/icons/SettingsInputComponent';
import FilterDramaIcon from '@material-ui/icons/FilterDrama';
import StraightenIcon from '@material-ui/icons/Straighten';
import NoteAddIcon from '@material-ui/icons/NoteAdd';
import LibraryAddIcon from '@material-ui/icons/LibraryAdd';
import PlaylistAddIcon from '@material-ui/icons/PlaylistAdd';
import PersonAddIcon from '@material-ui/icons/PersonAdd';
import GroupAddIcon from '@material-ui/icons/PersonAdd';
import CompareIcon from '@material-ui/icons/Compare';
import SaveIcon from '@material-ui/icons/Save';
import EditIcon from '@material-ui/icons/Edit';
import PlaylistAddCheckIcon from '@material-ui/icons/PlaylistAddCheck';
import QuestionPage from './QuestionPage';
import { provideEWISamplingLocations } from '../Utils/CalculationUtilities';
import SystemDialog from './SystemDialog';

// import SettingsInputComponentIcon from '@material-ui/icons/SettingsInputComponent';

const criticalUserNodes = ['stations'];
const criticalDefaultSystemNodes = ['navMenuInfo', 'dialogQuestions', 'questionsData', 'hiddenPanels', 'hiddenTabs'];
var itemsToSyncToLS = criticalDefaultSystemNodes.concat(criticalUserNodes);
itemsToSyncToLS.push("loggedInUser", "curSamplingEventName");

const questionIDsLinkedToStationName = ["stationNumber", "projectName", "projectID", "agencyCode"];
var needToSyncStationDataToQuestionData = false;


const SAMPLING_EVENT_IDENTIFIER = "SamplingEvent:";


class WebFF extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			itemsLoaded: [],
			usePaper: false,

			navMenuInfo: [],
			navMenuExpanded: false,

			isDialogQuestionsLoaded: false,
			dialogQuestions: [],
			dialogOpen: false,
			curDialogDescription: "",
			curDialogName: "",
			curDialogQuestions: [],

			defaultQuestionsData: [],
			isQuestionsDataLoaded: false,
			questionsData: [],

			hiddenPanels: [],

			systemMenuOpen: false,

			appBarText: "Sediment Field Forms",

			hiddenTabs: [],
			stations: [],

			loggedInUser: "jfederer@usgs.gov",

			curSamplingEventName: JSON.parse(localStorage.getItem('curSamplingEventName')) //TODO: multiple reloads mess this up if it starts null
		};

		this.navigationControl = this.navigationControl.bind(this);
		this.handleDialogOpen = this.handleDialogOpen.bind(this);
		this.handleSystemMenuItemClicked = this.handleSystemMenuItemClicked.bind(this);
		this.questionChangeSystemCallback = this.questionChangeSystemCallback.bind(this);
		this.dialogQuestionChangeSystemCallback = this.dialogQuestionChangeSystemCallback.bind(this);
		this.setLoggedInUser = this.setLoggedInUser.bind(this);
		this.addStation = this.addStation.bind(this);
		this.removeStation = this.removeStation.bind(this);
		this.createNewSamplingEvent = this.createNewSamplingEvent.bind(this);
		this.loadSamplingEvent = this.loadSamplingEvent.bind(this);
		this.getQuestionValue = this.getQuestionValue.bind(this);
		this.setQuestionValue = this.setQuestionValue.bind(this);

	}

	componentWillMount() { //FUTURE: could load just the missing parts insted of everything if just a single node is missing
		this.gatherSystemConfig(criticalDefaultSystemNodes, "defaultConfig");  //load default configurations
		this.gatherUserConfig(criticalUserNodes, "users/" + this.state.loggedInUser); //load user configuration



		//TODO: collect station info and combine with default questions and data
		// if(this.state.curSamplingEventName===null || this.state.curSamplingEventName === '') { //TODO: multiple reloads mess this up if it starts null
		// 	window.location.replace("/Dashboard");
		// 	console.log("Redirected");
		// }
	}

	componentWillUpdate(nextProps, nextState) { // when state updates, write it to LS
		//console.log("CWU");
		itemsToSyncToLS.forEach((item) => localStorage.setItem(item, JSON.stringify(nextState[item])));

		// check if "stations" value changed update options in questionsData appropriately if it did... checking that questionData might not actually be fully loaded yet
		//console.log("NEXTSTATIONS: ", nextState.stations);
		//console.log("STATIONS: ", this.state.stations);
		if (needToSyncStationDataToQuestionData) {
			if (nextState && this.state.questionsData !== nextState.questionData) {
				this.attemptToSyncStationDataToQuestionData();
			}
		}
		if (nextState && this.state.stations !== nextState.stations) {
			//console.log("Stations updated");
			needToSyncStationDataToQuestionData = true;
			this.attemptToSyncStationDataToQuestionData(nextState.stations);
		}

	}

	attemptToSyncStationDataToQuestionData(stationsIn) {
		let stationNameQ = this.getQuestionData("stationName");
		if (stationNameQ === null) {
			return;
		}

		let newOptions = {};
		let stationsToSync;
		if (stationsIn) {
			stationsToSync = stationsIn;
		} else {
			stationsToSync = this.state.stations.slice();
		}


		for (let i = 0; stationsToSync !== null && i < stationsToSync.length; i++) {
			newOptions[stationsToSync[i].id] = stationsToSync[i].id;
		}

		this.setQuestionData("deleteStation_stationName", "options", newOptions);
		this.setQuestionData("stationName", "options", newOptions, this.buildRoutesAndRenderPages);

		needToSyncStationDataToQuestionData = false;
	}




	gatherSystemConfig(nodesToGather, query) {
		// first looks in LS for every element in nodes.  If not found, pulls everything from DB.
		let DEBUG = false;

		if (DEBUG) console.log("gatherConfig: ", nodesToGather, query);
		// check if ALL critical items are loaded into LS
		// FUTURE: empty arrays count.... and we might want to double-check that against the DB
		let allLoadedInLS = true;
		for (let i = 0; i < nodesToGather.length; i++) {
			if (DEBUG) console.log(localStorage.getItem(nodesToGather[i]));
			if (!localStorage.getItem(nodesToGather[i]) || localStorage.getItem(nodesToGather[i]) === "null") {
				allLoadedInLS = false;
			}
			if (nodesToGather[i] === "stations" && localStorage.getItem(nodesToGather[i]) === "[]") {  //KLUDGE to allow for extra searching for stations given it's non-null in the constructor
				allLoadedInLS = false;
			}
		}
		if (DEBUG) console.log("allLoadedInLS: ", allLoadedInLS);

		if (allLoadedInLS) {
			if (DEBUG) console.log("pulling from LS");

			// pull everything from LS
			for (let i = 0; i < nodesToGather.length; i++) {
				let newItemsLoaded = this.state.itemsLoaded;
				if (!newItemsLoaded.includes(nodesToGather[i])) {
					newItemsLoaded.push(nodesToGather[i])
				}
				this.setState({
					[nodesToGather[i]]: JSON.parse(localStorage.getItem(nodesToGather[i])),
					itemsLoaded: newItemsLoaded
				}, this.buildRoutesAndRenderPages);
			}
		} else {
			// pull everything from DB

			this.fetchDBInfo(query, (JSONresponse) => {
				if (DEBUG) console.log("JSONresponse: ", JSONresponse);
				JSONresponse.forEach((configNode) => {
					if (DEBUG) console.log("ConfigNode: ", configNode);
					let nodeName = configNode.id;
					if (DEBUG) console.log("NodeName: ", nodeName);
					let nodeArrName = nodeName + "Arr";
					if (DEBUG) console.log("NodeArrName: ", nodeArrName)
					let nodeArr = configNode[nodeArrName];
					if (DEBUG) console.log("nodeArr: ", nodeArr);
					if (DEBUG) console.log("this.state.itemsLoaded: ", this.state.itemsLoaded);

					this.setState({ [nodeName]: nodeArr }, () => {
						if (DEBUG) console.log("STATE: ", this.state);
						if (DEBUG) console.log("ITEMSLOADED: ", this.state.itemsLoaded);
						let newItemsLoaded = this.state.itemsLoaded;
						newItemsLoaded.push(nodeName);
						this.setState({ "itemsLoaded": newItemsLoaded }, this.buildRoutesAndRenderPages); //performance
					});
				});
			});
		}
	}


	gatherUserConfig(nodesToGather, query) {
		//FIXME: likely bug source, as all these setStates happen async...  perhaps find a way to chain/batch them.

		// first looks in LS for every element in nodes.  If not found, pulls everything from DB.
		let DEBUG = false;

		if (DEBUG) console.log("gatherConfig: ", nodesToGather, "&", query);
		// check if ALL critical items are loaded into LS
		// FUTURE: empty arrays count.... and we might want to double-check that against the DB
		let allLoadedInLS = true;
		for (let i = 0; i < nodesToGather.length; i++) {
			if (DEBUG) console.log(localStorage.getItem(nodesToGather[i]));
			if (!localStorage.getItem(nodesToGather[i]) || localStorage.getItem(nodesToGather[i]) === "null") {
				allLoadedInLS = false;
			}
			if (nodesToGather[i] === "stations" && localStorage.getItem(nodesToGather[i]) === "[]") {  //KLUDGE to allow for extra searching for stations given it's non-null in the constructor
				allLoadedInLS = false;
			}
		}
		if (DEBUG) console.log("allLoadedInLS: ", allLoadedInLS);

		if (allLoadedInLS) {
			if (DEBUG) console.log("pulling from LS");

			// pull everything from LS
			for (let i = 0; i < nodesToGather.length; i++) {
				let newItemsLoaded = this.state.itemsLoaded;
				if (!newItemsLoaded.includes(nodesToGather[i])) {
					newItemsLoaded.push(nodesToGather[i])
				}
				this.setState({
					[nodesToGather[i]]: JSON.parse(localStorage.getItem(nodesToGather[i])),
					itemsLoaded: newItemsLoaded
				}, this.buildRoutesAndRenderPages);
			}

			// pull eventSamples
			let allNodeNames = Object.keys(localStorage);
			for (let i = 0; i < allNodeNames.length; i++) {
				if (allNodeNames[i].startsWith(SAMPLING_EVENT_IDENTIFIER)) {
					this.setState({ [allNodeNames[i]]: JSON.parse(localStorage.getItem(allNodeNames[i])) }, () => itemsToSyncToLS.push(allNodeNames[i]));
				}
			}



		} else {
			// pull everything from DB
			this.fetchDBInfo(query, (JSONresponse) => {
				if (DEBUG) console.log("JSONresponse: ", JSONresponse);
				let nodeArr = [];
				for (let i = 0; i < nodesToGather.length; i++) {
					JSONresponse[nodesToGather[i]].forEach((configNode) => {
						if (DEBUG) console.log("ConfigNode: ", configNode);
						// let nodeName = configNode.id;
						//TODO: error and duplication checking -- particularly important as custom questions exist
						// yes, this is basically destructing and reconstructing an array.  This is being done for easier error checking. (perhaps not actually easier)
						nodeArr.push(configNode);
					});
					this.setState({ [nodesToGather[i]]: nodeArr }, () => {
						if (DEBUG) console.log("STATE: ", this.state);
						if (DEBUG) console.log("ITEMSLOADED: ", this.state.itemsLoaded);
						let newItemsLoaded = this.state.itemsLoaded;
						newItemsLoaded.push(nodesToGather[i]);
						this.setState({ "itemsLoaded": newItemsLoaded }, this.buildRoutesAndRenderPages); //performance
					});
				}

				// pull sampling events from DB response
				let allNodeNames = Object.keys(JSONresponse);
				for (let i = 0; i < allNodeNames.length; i++) {
					if (allNodeNames[i].startsWith(SAMPLING_EVENT_IDENTIFIER)) {
						this.setState({ [allNodeNames[i]]: JSONresponse[allNodeNames[i]] }, () => itemsToSyncToLS.push(allNodeNames[i]));
					}
				}
			});
		}
	}


	getDateTimeString() {
		let d = new Date();
		let dateOfMonthString = ('0' + d.getDate()).slice(-2);
		let monthString = ('0' + (d.getMonth() + 1)).slice(-2);
		let dateString = d.getFullYear() + "-" + monthString + "-" + dateOfMonthString;
		let hoursString = ('0' + d.getHours()).slice(-2);
		let minutesString = ('0' + (d.getMinutes())).slice(-2);
		let secondsString = ('0' + (d.getMinutes())).slice(-2);
		let timeString = hoursString + ":" + minutesString + ":" + secondsString;
		return dateString + "@" + timeString;
	}


	createNewSamplingEvent() {
		// create new sampling event 
		let newSamplingEventID = this.getDateTimeString();
		let samplingEventName = SAMPLING_EVENT_IDENTIFIER + newSamplingEventID;

		// load initial values from questionsData  (and dialogQuestions?)
		let questionsValues = {};
		this.state.questionsData.map((Q) => {
			questionsValues[Q.id] = Q.value;
		});

		let newSamplingEvent = {
			id: newSamplingEventID,
			questionsValues: questionsValues
		}

		//ensure this sampling event will be sync'd to LS
		itemsToSyncToLS.push(samplingEventName);

		//save it to the state    (note, we'll use Object.keys(localStorage) to get this later)
		this.setState({ [samplingEventName]: newSamplingEvent, curSamplingEventName: samplingEventName }, () => this.runAllActionsForCurrentSamplingEvent());
	}



	materialIcon(icon) {
		switch (icon) {
			case 'DashboardIcon': return <DashboardIcon />
			case 'ImportContactsIcon': return <ImportContactsIcon />
			case 'OpacityIcon': return <OpacityIcon />
			case 'ReorderIcon': return <ReorderIcon />
			case 'ColorizeIcon': return <ColorizeIcon />
			case 'FilterDramaIcon': return <FilterDramaIcon />
			case 'StraightenIcon': return <StraightenIcon />
			case 'LibraryAddIcon': return <LibraryAddIcon />
			case 'PlaylistAddIcon': return <PlaylistAddIcon />
			case 'PersonAddIcon': return <PersonAddIcon />
			case 'GroupAddIcon': return <GroupAddIcon />
			case 'PlaylistAddCheckIcon': return <PlaylistAddCheckIcon />
			case 'NoteAddIcon': return <NoteAddIcon />
			case 'EditIcon': return <EditIcon />
			case 'CompareIcon': return <CompareIcon />
			case 'SaveIcon': return <SaveIcon />

			//TODO: additional good ones:  blur*, edit* (gives editor options...)
			default: return <SettingsInputComponentIcon />
		}
	}

	fetchDBInfo(_query, successCB) {
		const DEBUG = false;
		const API = 'http://localhost:3004/';
		const query = _query;

		function handleErrors(response) {
			// fetch only throws an error if there is a networking or permission problem (often due to offline).  A "ok" response indicates we actually got the info
			if (!response.ok) {
				throw Error(response.statusText);
			}
			//note 404 is not found and 400 is a mal-formed request
			return response;
		}

		if (DEBUG) console.log("Function: fetchDBInfo @ " + API + query);
		fetch(API + query)
			.then(handleErrors)
			.then(response => response.json())
			.then(
				parsedJSON => {
					if (DEBUG) console.log("Parsed JSON: ");
					if (DEBUG) console.log(parsedJSON);
					// // setTimeout(() => {
					successCB(parsedJSON);
					if (DEBUG) console.log("CurrentState: ");
					if (DEBUG) console.log(this.state);
					// }, 1200);
				})
			.catch(error => console.log("Error fetching " + API + query + "\n" + error));
	}

	handleDialogOpen() {
		this.setState({ dialogOpen: true });
	};

	handleDialogClose = () => {
		this.setState({ dialogOpen: false });
	};

	handleLeftDrawerOpen = () => {
		this.setState({ navMenuExpanded: true });
	};

	handleLeftDrawerClose = () => {
		this.setState({ navMenuExpanded: false });
	};

	handleSystemMenuIconClicked = () => {
		this.setState({ systemMenuOpen: true });
	};

	handleSystemMenuClose = () => {  //FUTURE: this seems tightly coupled.
		this.setState({ systemMenuOpen: false });
	};

	setAppBarText = (txt) => {
		this.setState({ appBarText: txt });
	};

	actionExecuter = (actionString) => { //****   //performance - are we building routes and needlessly rendering pages?
		//actionString: string in format: 'ACTION_NAME::PARAMETER' where...
		//   ACTION_NAME is one of the switch options below and
		//   PARAMETER is the parameter string to said action, generally this will be a questionID, though panels are identified like PAGENAME:PANELNAME.
		// note, actionExecuter does NOT check for validity of the PARAMETER part of the actionString.
		// void return
		// note, does not throw errors and instead only warns.  Actions as of 2018/08/8 are all only GUI sugar and thus shouldn't break the app.
		let splitActionString = actionString.split('::');
		if (splitActionString.length !== 2) {
			console.warn("Requested action string '" + actionString + "' is malformed.  Must only have one '::' per action.  Separate actions with '&'.");
		}
		switch (splitActionString[0]) {
			case "ShowTab":
				this.showTabOrPanel(splitActionString[1], true, true, this.buildRoutesAndRenderPages());
				break;
			case "HideTab":
				this.showTabOrPanel(splitActionString[1], false, true, this.buildRoutesAndRenderPages());
				break;
			case "ShowQuestion":
				this.showQuestion(splitActionString[1], true);
				this.buildRoutesAndRenderPages();
				break;
			case "HideQuestion":
				this.showQuestion(splitActionString[1], false);
				this.buildRoutesAndRenderPages();
				break;
			case "ShowPanel":
				this.showTabOrPanel(splitActionString[1], true, false, this.buildRoutesAndRenderPages());
				break;
			case "HidePanel":
				this.showTabOrPanel(splitActionString[1], false, false, this.buildRoutesAndRenderPages());
				break;
			default:
				console.warn("Requested action '" + splitActionString[0] + "' not recognized");
		}
	}

	navigationControl(tabName, add) { //TODO: remove and fix... it's just a pass-along and might not be needed given we navigate from state now
		this.showTabOrPanel(tabName, add, true);
	}

	jsonToNavMenu(jsonNavData) {
		// this function filters tabs based on the "showXYZ" items in state
		// console.log(jsonNavData);
		var retMenu = [];
		for (var i = 0; i < jsonNavData.length; i++) {
			var menuItem = jsonNavData[i];
			var shouldInclude = !this.state.hiddenTabs.includes(menuItem.text.replace(/ /g, ''));

			// use icon?
			let useIcon = true;
			if (menuItem.icon === "") {
				useIcon = false;
			}

			if (shouldInclude) retMenu.push(
				<ListItem key={menuItem.route + "_key"} button component={Link} to={menuItem.route}>
					{(useIcon) ? <ListItemIcon>
						{this.materialIcon(menuItem.icon)}
					</ListItemIcon> : null}
					<ListItemText className={styles.navMenuText} primary={menuItem.text} />
				</ListItem>
			);
		}
		return retMenu;
	}

	showTabOrPanel(name, toShow, isTab, CB) {  //*****
		// name: name of tab, formatted 'PAGE_NAME:PANEL_NAME"... whitespacing doesn't not matter.
		// toShow: whether to show the panel or not (done by adding or removing panelName from from this.state.hiddenPanels)
		// isTab: boolean... if true, name is a tab (and we'll use hiddenTabs), if false, name is a panel (and we'll use hiddenPanels)
		// CB: callback function after the state has been set.
		// void return

		// note, this does not warn or error if nothing was found.  This is the expected bahavior, as it's expected questions might be set to 'remove' things that are alrady removed.

		const processHidden = (hiddenArr) => {
			let cleanName = name.replace(/ /g, '');
			if (toShow) {
				hiddenArr = hiddenArr.filter((item) => item.replace(/ /g, '') !== cleanName)
			} else {
				hiddenArr.push(cleanName)
			}
			return hiddenArr;
		}

		let listName = "hiddenTabs";
		if (!isTab) {
			listName = "hiddenPanels";
		}

		this.setState((prevState, props) => ({ [listName]: processHidden([...prevState[listName]]) }), () => {
			if (typeof CB === "function") {
				CB();
			}
		})
	}

	showQuestion(questionID, toShow) {
		// find the specific question in this.state.questionData based on the id, then update the hidden property

		let DEBUG = false;
		if (DEBUG) console.log("Show Question: ", questionID, " toShow: ", toShow);

		let anyFound = false;  // if this remains false, let's check the dialogQuestions...
		let updatedQuestionsData = this.state.questionsData.filter(questionData => {
			if (questionData.id === questionID) {
				if (DEBUG) console.log("------FOUND!--------");
				if (DEBUG) console.log(questionData);
				questionData['hidden'] = !toShow;
				anyFound = true;
			} else {
				if (DEBUG) console.log("questionData.id :", questionData.id, " and questionID: ", questionID, " do not match");
			}
			return questionData;
		});

		if (anyFound) {
			if (DEBUG) console.log("updatedQuestionsData: ", updatedQuestionsData);  // note, this is the entire questionsData set...//performance
			this.setState({ questionsData: updatedQuestionsData });
		} else {
			// Q_id was not found in questionsData
			let updatedCurDialogQuestions = this.state.curDialogQuestions.filter(questionData => {
				if (questionData.id === questionID) {
					if (DEBUG) console.log("------FOUND!--------");
					if (DEBUG) console.log(questionData);
					questionData['hidden'] = !toShow;
				} else {
					if (DEBUG) console.log("questionData.id :", questionData.id, " and questionID: ", questionID, " do not match");
				}
				return questionData;
			});
			this.setState({ curDialogQuestions: updatedCurDialogQuestions });
		}

		// replace the questionData in localStorage
		//		localStorage.setItem('questionsData', JSON.stringify(rawData));
	}



	setQuestionData(q_id, key, value, CB) { //**
		// q_id: string question ID associated with a question
		// key: string used as key in questionData object
		// value: value that key will be set to
		// CB: callback function to be called after the value has been set
		// void return

		// sets the 'key' element to 'value' for the question with question id of q_id ... 
		// when looking for q_id, searches default questions (questionsData) first, TODO: then dialog questions, then TODO: user/station questions
		// TODO: if the key is 'value', offload to "setQuestionValue" function

		// TODO: throws error if no question matching q_id is found

		// TODO: performance: rebuilds entire questionsData... needlessly?

		if (key === "value") { // updating value is special and has it's own storage locations.  Call appropriate function that handles it well.
			this.setQuestionValue(q_id, value, CB);
			return;
		}

		let anyFound = false;
		var newQuestionsData = this.state.questionsData.filter(questionData => {
			if (questionData.id === q_id) {
				questionData[key] = value;
				anyFound = true;
			}
			return questionData;
		});

		if (anyFound) {
			this.setState({ questionsData: newQuestionsData }, CB);
		} else {
			let newDialogQuestions = this.state.dialogQuestions.slice();
			for (let i = 0; i < newDialogQuestions.length && !anyFound; i++) {
				var specificDialogQuestions = newDialogQuestions[i].questions.filter(questionData => {
					if (questionData.id === q_id) {
						questionData[key] = value;
						anyFound = true;
					}
					return questionData;
				});
				if (anyFound) {
					newDialogQuestions[i].questions = specificDialogQuestions;
					this.setState({ dialogQuestions: newDialogQuestions }, CB);
				}
			}
		}
	}

	getQuestionData(q_id) {
		// returns question from questionsData that has q_id.  If none is found, return null
		// WARNING: DO NOT USE THIS TO ACCESS "VALUE" unless you are aware it might be wrong (the value stored in questionsData is the default... the real 'value' is stored in the samplingEvent)
		// TODO: verify all uses of this function are safe and/or depricate and/or remove this function
		let retArr = this.state.questionsData.filter(questionData => {
			if (questionData.id === q_id) {
				return questionData;
			}
			return null;
		});

		if (retArr.length === 1) {
			return retArr[0];
		} else {
			//TODO: throw error
			return null;
		}
	}

	setQuestionValue(q_id, value, CB) { //**** // return should be better
		// q_id: string question ID associated with a question
		// value: value that should be saved in state
		// CB: function that should be called after setState
		// returns void (TODO: return questoinData format associated with the q_id WITH the updated value inserted)
		// sets the value of the first question it finds while searching in this order:currentSamplingEvent, dialogQuestions, then, finally, questionsData.
		// note, given currentSamplingEvent is built from questionsData, the instances where a value would be in questionsData and NOT in current sampling event are very exotic
		// throws error if no question is found

		let DEBUG=false;
		if(DEBUG)console.log("setQuestionValue(" + q_id + ", "+value+")");

		// search in current Sampling Event
		let curSE = Object.assign({},this.state[this.state.curSamplingEventName]);
		if ((Object.keys(curSE).length === 0 && curSE.constructor === Object) || !curSE.questionsValues) { // current sampling event is not loaded or is malformed.
			throw new Error("current sampling event, " + curSE + " is not loaded or is malformed in setQuestionValue(" + q_id + ", "+value+")");
		}
		if (q_id in curSE.questionsValues) {
			let newQuestionsValues = curSE.questionsValues;
			//console.log("newQuestionsValues PRE)", newQuestionsValues); //TODO: the value is already correct here... BEFORE we have even set it.
			newQuestionsValues[q_id] = value;
			let newCurSE = {...curSE, questionsValues:newQuestionsValues};
			this.setState({ [this.state.curSamplingEventName]: newCurSE} , CB);
			return;
		}

		// search in dialog questions
		let newDQ = this.state.dialogQuestions.slice();
		for (let i = 0; newDQ && i < newDQ.length; i++) {
			for (let k = 0; newDQ[i] && k < newDQ[i].questions.length; k++) {
				if (newDQ[i].questions[k].id === q_id) {
					newDQ[i].questions[k].value = value;
					this.setState({"dialogQuestions":newDQ}, CB);
					return; 
				}
			}
		}

		// search in questions data.  given this should be very rare, give a warning.
		let newQD = this.state.questionsData.slice();
		for (let i = 0; newQD && i < newQD.length; i++) {
			if (newQD[i].id === q_id) {
				console.warn("Setting value ("+value+") on " + q_id + " and it only exists in questionsDialog.  This should be investigated, as it should be very rare.")
				newQD[i].value = value;
				this.setState({questionsData:newQD}, CB);
				return ;
			}
		}

		throw new Error("Question not found in current sampling event, dialog questions, or default config questions.  WebFF.getQuestionValue(" + q_id + ")");
	}

	getQuestionValue(q_id) { //****  //TODO: error reasonably when  curSamplingEvent is undefined
		// q_id: string question ID associated with a question
		// returns VALUE associated with the q_id... first searching currentSamplingEvent, then searching the dialogQuestions, then, finally, questionsData.
		// note, given currentSamplingEvent is built from questionsData, the instances where a value would be in questionsData and NOT in current sampling event are very exotic
		// throws error if no question is found
		let curSE = Object.assign({},this.state[this.state.curSamplingEventName]);
		if ((Object.keys(curSE).length === 0 && curSE.constructor === Object) || !curSE.questionsValues) { // current sampling event is not loaded or is malformed.
			// current sampling event is not loaded or is malformed.
			throw new Error("current sampling event, " + curSE + " is not loaded or is malformed in getQuestionValue(" + q_id + ")");
		}
		if (q_id in curSE.questionsValues) {
			return curSE.questionsValues[q_id];
		}

		for (let i = 0; this.state.dialogQuestions && i < this.state.dialogQuestions.length; i++) {
			for (let k = 0; this.state.dialogQuestions[i] && k < this.state.dialogQuestions[i].questions.length; k++) {
				if (this.state.dialogQuestions[i].questions[k].id === q_id) {
					return this.state.dialogQuestions[i].questions[k].value;
				}
			}
		}

		for (let i = 0; i < this.state.questionsData.length; i++) {
			if (this.state.questionsData[i].id === q_id) {
				return this.state.questionsData[i].value;
			}
		}

		throw new Error("Question not found in current sampling event, dialog questions, or default config questions.  WebFF.getQuestionValue(" + q_id + ")");
	}

	setLoggedInUser(username) {
		console.log(this);
		// this.setState({ loggedInUser: username }, this.buildRoutesAndRenderPages);
		this.setState({ loggedInUser: username }, this.componentWillMount); //TODO: not rebuilding for new users
	}


	parseActionsFromQuestion(Q, actionExecuter) {  //TODO: probably can fix the fact we have two of these functions
		// Q can be a Question Component OR questionData object -- differentiated by the presence of 'props'
		// note, if questionData is passed, we get the value from the currentSamplingEvent
		let actionsExist = false;
		let q_id;
		let actions;
		if (Q.props) {
			// this Q is a Question component
			actionsExist = Q.props.actions;
			q_id = Q.props.id;
			actions = Q.props.actions;
		} else {
			// this Q is questionData object
			actionsExist = Q.actions;
			q_id = Q.id;
			actions = Q.actions;
		}

		if (actionsExist) {
			let q_val = this.getQuestionValue(q_id);
			let commandString = actions[q_val];
			if (commandString) {
				let actionsToDo = commandString.split('&');
				actionsToDo.forEach((action) => {
					actionExecuter(action);
				});
			}
		}
	}

	dialogQuestionChangeSystemCallback(Q) {
		console.log("DialogQuestion: ", Q);
		//	console.log(this.state.curDialogQuestions);

		this.questionChangeSystemCallback(Q, true);

	}

	questionChangeSystemCallback(Q, dialogQuestion) {
		// Q: Question COMPONENT (presumably that just called this)
		// dialogQuestoin: Boolean of if Q is a 'dialogQuestion'. Optional (missing value will be treated as normal question)
		// updates value of Q in state, checks for action string, executes any actions

		let DEBUG = false;
		if (DEBUG) console.log("questionChangeSystemCallback: ", Q, "   dialogQuestion: ", dialogQuestion);
		if (DEBUG) console.log("this.state.curSamplingEventName: ", this.state.curSamplingEventName);
		if (DEBUG) console.log("this.state[this.state.curSamplingEventName]: ", this.state[this.state.curSamplingEventName]);

		if (Q == null) {
			throw new Error("questionChangeSystemCallback required field, question, is null");
		}

		//HARDCODE for paper settings:
		if (Q.props.id === "settings_paper") {
			this.setState({ usePaper: Q.state.value });
			this.handleSystemMenuItemClicked("Settings");
		}

		//HARDCODE for stationName drop down
		if (Q.props.id === "stationName") {
			if (DEBUG) console.log("stationName: ", Q.state.value);
			// find the station we are talking about
			let stationIndex = 0;
			for (let i = 0; i < this.state.stations.length; i++) {
				if (this.state.stations[i].id === Q.state.value) {
					stationIndex = i;
				}
			}
			let stationData = this.state.stations[stationIndex];
			if (DEBUG) console.log("stationData", stationData);

			for (let i = 0; i < questionIDsLinkedToStationName.length; i++) {
				let q_id = questionIDsLinkedToStationName[i];
				this.setQuestionValue(q_id, stationData[q_id], this.buildRoutesAndRenderPages);
			}
		}

		//HARDCODE for numberOfSamplingPoints
		let propagateSamplePointData = false;
		if (Q.props.id === "numberOfSamplingPoints") {
			console.log("numberOfSamplingPoints: ", Q.state.value);
			propagateSamplePointData = true;
		}

		this.setQuestionValue(Q.props.id, Q.state.value, ()=> {
			this.parseActionsFromQuestion(Q, this.actionExecuter);
			if (propagateSamplePointData) {
				this.collectRunAndPropagateSamplePointData();
			}
			this.buildRoutesAndRenderPages();
		});
	}

	getQuestionsDataWithUpdatedValue(Q, dialogQuestions) {
		//this function saves updated question "values" (must be located at "Q.state.value")
		// returns updated questionsData object
		var DEBUG = false;
		if (DEBUG) console.log("getQuestionsDataWithUpdatedValue: Q: ", Q);
		if (Q == null) { //POC
			console.log("Question passed to getQuestionsDataWithUpdatedValue was null or undefined");
			return;
		}

		// find the specific question in questionsData  or curDialogQuestions based on the id,then update the value property
		let questionsToFilter = this.state.curDialogQuestions;
		if (!dialogQuestions) {
			questionsToFilter = this.state.questionsData;
		}

		var newQuestionsData = questionsToFilter.filter(questionData => {
			//console.log("QuestionData: ", questionData);
			if (questionData.id === Q.props.id) {
				if (DEBUG) console.log("------FOUND!--------");
				if (DEBUG) console.log("getQuestionsDataWithUpdatedValue: questionData (pre): ", questionData);
				if (DEBUG) console.log("getQuestionsDataWithUpdatedValue: Q.state.value", Q.state.value);

				questionData.value = Q.state.value;

				if (DEBUG) console.log("getQuestionsDataWithUpdatedValue: questionData (post)", questionData);
			} else {
				if (DEBUG) console.log("getQuestionsDataWithUpdatedValue: no");
			}
			return questionData;
		});

		if (DEBUG) console.log("getQuestionsDataWithUpdatedValue: newQuestionsData: ", newQuestionsData);

		return newQuestionsData;
	}




	loadSamplingEvent(samplingEventName) {
		//TODO: return all items to default state BEFORE loading and running?
		this.setState({ curSamplingEventName: samplingEventName }, this.runAllActionsForCurrentSamplingEvent);
	}


	runAllActionsForCurrentSamplingEvent() { //***   not a fan of the use of getQuestionData
		// runs through every question in questionsData, if that question has actions checks the value of said question and runs appropraite actions
		let DEBUG = false;
		this.state.questionsData.map((questionData) => { // for each question
			if (questionData.actions) { // check if it has an actions node
				// it does! let's check the value of this question in our current event
				if (DEBUG) {
					let q_val = this.state[this.state.curSamplingEventName].questionsValues[questionData.id];
					console.log("questionData.id: ", questionData.id, "q_val: ", q_val);
				}
				this.parseActionsFromQuestion(this.getQuestionData(questionData.id), this.actionExecuter);
			}
		})
	}

	removeStation(stationIDToDelete) {
		let newStations = this.state.stations.filter((station) => {
			if (station.id !== stationIDToDelete) {
				return true;
			}
			return false;
		});

		this.setState({ stations: newStations }, () => { this.attemptToSyncStationDataToQuestionData(); this.syncStationsToDB(); });
	}

	addStation(stationName, stationNumber, projectName, projectID, agencyCode) {
		let newStation = {
			id: stationName,
			stationNumber: stationNumber,
			projectName: projectName,
			projectID: projectID,
			agencyCode: agencyCode
		}
		let newStations = this.state.stations.slice();
		newStations.push(newStation);
		console.log("newStations: ", newStations);
		console.log("this.state.stations: ", this.state.stations);
		//TODO: validation

		this.setState({ stations: newStations }, () => { this.attemptToSyncStationDataToQuestionData(); this.syncStationsToDB(); });
	}

	buildRoutesAndRenderPages = () => {   //TODO:  move to the render function -- currently needs to be called any time content on question pages needs to be modified.  Suspect structural issue with a nested setState inside the questionPage
		//  console.log("BAR");
		let questionsValues = null;
		if (this.state[this.state.curSamplingEventName]) {
			questionsValues = this.state[this.state.curSamplingEventName].questionsValues;
		}

		var newRoutesAndPages = (
			<Switch> {/* only match ONE route at a time */}
				<Route exact path="/" render={() => <h1>HOME</h1>} />

				<Route path="/Dashboard" render={() => <Dashboard
					appBarTextCB={this.setAppBarText}
					text="Dashboard"
					navControl={this.navigationControl}
					globalState={this.state}
					createNewSamplingEvent={this.createNewSamplingEvent}
					loadSamplingEvent={this.loadSamplingEvent}
				/>} />
				<Route render={() => <QuestionPage
					appBarTextCB={this.setAppBarText}
					tabName={this.props.location.pathname.slice(1)}
					navControl={this.navigationControl}
					systemCB={this.questionChangeSystemCallback}
					questionsData={this.state.questionsData}
					questionsValues={questionsValues}
					hiddenPanels={this.state.hiddenPanels}
					globalState={this.state}
				/>} />
				{/* {this.state.navMenu} */}
				{/* //FUTURE: do some processing on pathname to give good human-readable tabnames */}
				<Route render={() => <ErrorPage
					errMsg="Route was not found"
					appBarTextCB={this.setAppBarText}
					navControl={this.navigationControl}
				/>} />
			</Switch>
		); //performance

		this.setState({ routesAndPages: newRoutesAndPages });
	};


	collectRunAndPropagateSamplePointData() {
		//FIXME:  This overwrites values in the table if any exist //TODO: check current value and insert
		//TODO: FIXME: getQuestionData needs to switch to getQuestionValue... getQuestionData is returning faulty information
		let numSampPoints = null;
		//console.log(this.state);
		if (this.state.itemsLoaded.includes('questionsData')) {
			numSampPoints = this.getQuestionData("numberOfSamplingPoints").value;
		}


		if (numSampPoints !== null && numSampPoints !== "" && numSampPoints > 0) {
			// pull variables from fields
			let LESZ = this.getQuestionData("edgeOfSamplingZone_Left").value;
			let RESZ = this.getQuestionData("edgeOfSamplingZone_Right").value;

			let pierlocs = [];
			let pierWids = [];
			for (let i = 0; i < 6; i++) {
				pierlocs.push(this.getQuestionData("pier" + (i + 1) + "_start").value);

				let pierWidth = this.getQuestionData("pier" + (i + 1) + "_end").value - pierlocs[i];
				pierWids.push(pierWidth);
			}


			let tempValArr = provideEWISamplingLocations(LESZ, RESZ, pierlocs, pierWids, numSampPoints);

			// turn this into an array of 1-length array values for ingestion to table 
			let newVal = new Array(tempValArr.length);
			for (let i = 0; i < tempValArr.length; i++) {
				newVal[i] = [tempValArr[i]];
			}

			this.setQuestionData("EWI_samples_table", newVal);
		}
	}


	updateDBInfo(location, data, CB) {
		// attempts to update location
		// returns the ENTIRE newly updated data element.

		const DEBUG = true;
		const API = 'http://localhost:3004/';
		const query = location;
		// function handleErrors(response) {
		// 	// fetch only throws an error if there is a networking or permission problem (often due to offline).  A "ok" response indicates we actually got the info
		// 	if (!response.ok) {
		// 		throw Error(response.statusText);
		// 	}
		// 	return response;
		// }

		let URI = API + query;

		if (DEBUG) console.log("Function: fetchDBInfo PATCH @ " + URI);

		fetch(URI, {
			method: 'PATCH',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		}).then(function (response) {
			if (response.status === 200) {
				return response.json();
			}
			return null;
		}).then(function (json) {
			CB(json);
		}).catch(error => console.log("Error fetching " + API + query + "\n" + error));
	}

	// createDBInfo(location, data) {
	// 	// attempts to update location
	// 	// returns the ENTIRE newly updated data element.

	// 	const DEBUG = true;
	// 	const API = 'http://localhost:3004/';
	// 	const query = location;
	// 	// function handleErrors(response) {
	// 	// 	// fetch only throws an error if there is a networking or permission problem (often due to offline).  A "ok" response indicates we actually got the info
	// 	// 	if (!response.ok) {
	// 	// 		throw Error(response.statusText);
	// 	// 	}
	// 	// 	return response;
	// 	// }

	// 	let URI=API + query;

	// 	fetch(URI, {
	// 		method: 'PUT',
	// 		headers: {
	// 			'Accept': 'application/json',
	// 			'Content-Type': 'application/json'
	// 		},
	// 		body: JSON.stringify(data)
	// 	}).then(function (response) {
	// 		if(response.status===404 && !putAlreadyAttempted) {
	// 			// the resource didn't exist and needs to be 'put' instead of 'patched'.
	// 			console.log("this was a 404");
	// 			this.putDBInfo(location, data, true, put);
	// 		}
	// 		console.log("Response: ", response);
	// 		return response.json();
	// 	}).then(function (json) {
	// 		return "dsfsdf";
	// 	}).catch(error => console.log("Error fetching " + API + query + "\n" + error));
	// }



	syncStationsToDB() {
		let patchData = { "stations": this.state.stations };
		this.updateDBInfo("users/" + this.state.loggedInUser, patchData, (resp) => null);
	}

	syncSamplingEventToDB(samplingEventName) {
		//console.log(Object.keys(localStorage));

		//example to syncCurrentSamplingEvent: this.syncSamplingEventToDB(this.state.curSamplingEventName);

		let patchData = { [samplingEventName]: this.state[samplingEventName] };
		this.updateDBInfo("users/" + this.state.loggedInUser, patchData, (resp) => null);
	}



	handleSystemMenuItemClicked(menuText) {
		//TODO: //FIXME: changes to stream characteritics blanks out value in EWI table
		//TODO: if critical element for Bridge Wizard is removed from Field Form, what should we do?
		//TODO: dynamic pier additions (perhaps do this via an action -- drop down or number input for # of piers.  Cheap, easy, dirty.)
		//TODO: split analysis source code into check boxes
		//TODO: Change labels or any question value as an 'action'.
		//TODO: generalize EWI_setInfo_table
		//TODO: not a fan of just handing around global state.
		//TODO: regex to remove spaces in computation string
		//TODO: computeValue calculate TIME values correctly?
		//TODO: set 'value' of TimeInput questions correctly.
		//TODO: pass state change handlers to dialogs so questions don't yell
		//TODO: table width to contents? Wrap? No wrap but have min size?  Sub-questions and fields need sizes as well.
		//TODO: vertical gridding or vertical panels? (might be able to solve with 'layout table' stuff)
		//TODO: optional column headers for tables
		//TODO: //FIXME: system dialogs need different state change handler because their values are stored elsewhere
		//TODO: Question order priority
		//TODO: read-only columns in table
		//TODO: refactor network tasks to UTIL
		//TODO: standardize tooltips within questions
		//TODO: standardize 'styles' within questions
		//TODO: standardize 'placeholder' within questions
		//TODO: utilize isLoaded to hold off processing until done loading

		if (menuText === "Test Connection") {
			console.log("Testing ...")

			// this sync's this.state.stations to the DB.  WORKS.
			//this.syncSamplingEventToDB(this.state.curSamplingEventName);

		}

		// build the curDialogXXX data
		this.setState({ curDialogName: menuText });


		let filteredDialogInfo = this.state.dialogQuestions.filter((dialogItem) => {
			return dialogItem.dialogName.replace(/ /g, '') === menuText.replace(/ /g, '')
		});

		if (filteredDialogInfo && filteredDialogInfo.length === 1) {
			this.setState({
				curDialogDescription: filteredDialogInfo[0].dialogDescription,
				curDialogName: menuText,
				curDialogQuestions: filteredDialogInfo[0].questions
			}, () => { //open the dialog 
				this.handleDialogOpen();
			}
			);

		} else {
			//TODO: ERR
			console.log(menuText + " is not yet implemented");
		}

	}

	render() {
		const { classes } = this.props;
		// console.log("RENDER");

		return (
			<div className={classes.root} >
				<AppBar
					position="absolute"
					className={classNames(classes.appBar, this.state.navMenuExpanded && classes.appBarShift)}
				>
					<Toolbar disableGutters={!this.state.navMenuExpanded}>
						<IconButton
							color="inherit"
							aria-label="expand drawer"
							onClick={this.handleLeftDrawerOpen}
							className={classNames(classes.menuButton, this.state.navMenuExpanded && classes.hide)}
						>
							<ChevronRightIcon />
						</IconButton>

						<Typography variant="title" color="inherit" noWrap>
							{this.state.appBarText}
						</Typography>

						<IconButton
							color="inherit"
							aria-label="System Menu"
							onClick={this.handleSystemMenuIconClicked}
							className={classNames(classes.menuButton, classes.rightJustify, this.state.systemMenuOpen && classes.hide)}
						>
							<MenuIcon />
						</IconButton>
					</Toolbar>

				</AppBar>

				<SystemMenu isOpen={this.state.systemMenuOpen}
					closeHandler={this.handleSystemMenuClose}
					menuItemClickHandler={this.handleSystemMenuItemClicked} />
				<SystemDialog isOpen={this.state.dialogOpen}
					closeHandler={this.handleDialogClose}
					dialogQuestions={this.state.curDialogQuestions}
					dialogName={this.state.curDialogName}
					dialogDescription={this.state.curDialogDescription}
					stateChangeHandler={this.dialogQuestionChangeSystemCallback}
					globalState={this.state}
					setLoggedInUser={this.setLoggedInUser}
					addStation={this.addStation}
					removeStation={this.removeStation} />
				<NavMenu isExpanded={this.state.navMenuExpanded}
					closeHandler={this.handleLeftDrawerClose}
					menuItems={this.jsonToNavMenu(this.state.navMenuInfo)} />

				<main className={classes.content} >
					<div className={classes.toolbar} />  {/*to push down the main content the same amount as the app titlebar */}

					{this.state.routesAndPages}

				</main>
			</div >
		);
	}
}

WebFF.propTypes = {
	classes: PropTypes.object.isRequired
};

export default withRouter(withStyles(styles, { withTheme: true })(WebFF));