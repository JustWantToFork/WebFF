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

const criticalDefaultNodes = ['navMenuInfo', 'dialogQuestions', 'questionsData', 'hiddenPanels', 'hiddenTabs'];
const itemsToSyncToLS = criticalDefaultNodes;

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

			isQuestionsDataLoaded: false,
			questionsData: [],

			hiddenPanels: [],

			systemMenuOpen: false,

			appBarText: "Sediment Field Forms",

			hiddenTabs: [],
		};
		this.navigationControl = this.navigationControl.bind(this);
		this.handleDialogOpen = this.handleDialogOpen.bind(this);
		this.handleSystemMenuItemClicked = this.handleSystemMenuItemClicked.bind(this);
		this.questionChangeSystemCallback = this.questionChangeSystemCallback.bind(this);
	}

	componentWillUpdate(nextProps, nextState) { // when state updates, write it to LS
		itemsToSyncToLS.forEach((item) => localStorage.setItem(item, JSON.stringify(nextState[item])));
	}


	componentWillMount() { //FUTURE: could load just the missing parts insted of everything if just a single node is missing
		let DEBUG = false;

		// check if ALL items are loaded into LS
		let allLoadedInLS = true;
		for (let i = 0; i < criticalDefaultNodes.length; i++) {
			if (!localStorage.getItem(criticalDefaultNodes[i])) {
				allLoadedInLS = false;
			}
		}

		if (allLoadedInLS) {
			// pull everything from LS
			for (let i = 0; i < criticalDefaultNodes.length; i++) {
				let newItemsLoaded = this.state.itemsLoaded;
				if (!newItemsLoaded.includes(criticalDefaultNodes[i])) {
					newItemsLoaded.push(criticalDefaultNodes[i])
				}
				this.setState({
					[criticalDefaultNodes[i]]: JSON.parse(localStorage.getItem(criticalDefaultNodes[i])),
					itemsLoaded: newItemsLoaded
				}, this.buildRoutesAndRenderPages);
			}
		} else {
			// pull everything from DB
			//load default configurations
			this.newFetch("defaultConfig", (defaultConfigJSON) => {
				defaultConfigJSON.forEach((configNode) => {
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


		//TODO: collect info and combine with per user, per station questions

	}

	navigationControl(tabName, add) { //TODO: remove and fix... it's just a pass-along and might not be needed given we navigate from state now
		this.showTab(tabName, add);
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

	newFetch(_query, successCB) {
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
					// let newItemsLoaded = this.state.itemsLoaded;
					// newItemsLoaded.push(query);
					// // setTimeout(() => {
					successCB(parsedJSON);
					// this.setState({
					// 	[query]: parsedJSON,
					// 	itemsLoaded: newItemsLoaded
					// }, this.buildRoutesAndRenderPages);
					if (DEBUG) console.log("CurrentState: ");
					if (DEBUG) console.log(this.state);
					// }, 1200);
				})
			.catch(error => console.log("Error fetching " + API + query + "\n" + error));
	}

	fetchDBInfo(_query) {
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
					let newItemsLoaded = this.state.itemsLoaded;
					newItemsLoaded.push(query);
					// setTimeout(() => {
					this.setState({
						[query]: parsedJSON,
						itemsLoaded: newItemsLoaded
					}, this.buildRoutesAndRenderPages);
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

	actionExecuter = (actionString) => {
		let splitActionString = actionString.split('::');
		if (splitActionString.length !== 2) {
			//TODO: Throw error
		}
		switch (splitActionString[0]) {
			case "ShowTab":
				this.showTab(splitActionString[1], true);
				break;
			case "HideTab":
				this.showTab(splitActionString[1], false);
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
				this.showQuestionPanel(splitActionString[1], true);
				this.buildRoutesAndRenderPages();
				break;
			case "HidePanel":
				this.showQuestionPanel(splitActionString[1], false);
				this.buildRoutesAndRenderPages();
				break;
			default:
				//TODO: throw error
				console.log("Requested action '" + splitActionString[0] + "' not recognized");
		}
	}

	showTab(tabName, toShow) {
		let newHiddenTabs = this.state.hiddenTabs;
		let cleanTabName = tabName.replace(/ /g, '');
		if (toShow) {
			// remove all instances from newHiddenTabs
			while (newHiddenTabs.includes(cleanTabName)) {
				let index = newHiddenTabs.indexOf(cleanTabName);
				if (index > -1) {
					newHiddenTabs.splice(index, 1);
				}
			}
		} else {
			// add tabName to newHiddenTabs
			newHiddenTabs.push(cleanTabName);

		}
		this.setState({ hiddenTabs: newHiddenTabs });
	}

	showQuestion(questionID, toShow) {
		let DEBUG = false;
		if (DEBUG) console.log("Show Question: ", questionID, " toShow: ", toShow);
		// find the specific question in this.state.questionData based on the id, then update the hidden property
		let updatedQuestionsData = this.state.questionsData.filter(questionData => {
			if (questionData.id === questionID) {
				if (DEBUG) console.log("------FOUND!--------");
				if (DEBUG) console.log(questionData);
				questionData['hidden'] = !toShow;
			} else {
				if (DEBUG) console.log("questionData.id :", questionData.id, " and questionID: ", questionID, " do not match");
			}
			return questionData;
		});

		if (DEBUG) console.log(updatedQuestionsData);
		this.setState({ questionsData: updatedQuestionsData });
		// replace the questionData in localStorage
		//		localStorage.setItem('questionsData', JSON.stringify(rawData));
	}

	showQuestionPanel(panelName, toShow) {
		console.log("this.state.hiddenPanels:", this.state.hiddenPanels);
		let newHiddenPanels = this.state.hiddenPanels;
		console.log("toShow: ", toShow);
		if (toShow) {  // remove all instances of panelName from hiddenPanels
			while (newHiddenPanels.includes(panelName)) {
				let index = newHiddenPanels.indexOf(panelName);
				if (index > -1) {
					newHiddenPanels.splice(index, 1);
				}
			}
		} else { // not toShow:  add panelName to newHiddenPanels
			if (!newHiddenPanels.includes(panelName)) {
				newHiddenPanels.push(panelName);
			}
		}
		console.log("showQuestionPanel: newHiddenPanels: ", newHiddenPanels);
		this.setState({ hiddenPanels: newHiddenPanels });
	}


	getQuestionDataWithUpdatedValue(Q) {
		//this function saves updated question "values" (must be located at "Q.state.value")
		// returns updated questionsData object
		var DEBUG = false;
		if (DEBUG) console.log("getQuestionDataWithUpdatedValue: Q: ", Q);
		if (Q == null) { //POC
			console.log("Question passed to getQuestionDataWithUpdatedValue was null or undefined");
			return;
		}

		// find the specific question in questionsData based on the id,then update the value property
		var newQuestionsData = this.state.questionsData.filter(questionData => {
			//console.log("QuestionData: ", questionData);

			if (questionData.id === Q.props.id) {
				if (DEBUG) console.log("------FOUND!--------");
				if (DEBUG) console.log("getQuestionDataWithUpdatedValue: questionData (pre): ", questionData);
				if (DEBUG) console.log("getQuestionDataWithUpdatedValue: Q.state.value", Q.state.value);
				questionData.value = Q.state.value;
				if (DEBUG) console.log("getQuestionDataWithUpdatedValue: questionData (post)", questionData);
			} else {
				if (DEBUG) console.log("getQuestionDataWithUpdatedValue: no");
			}
			return questionData;
		});

		if (DEBUG) console.log("getQuestionDataWithUpdatedValue: newQuestionsData: ", newQuestionsData);

		return newQuestionsData;
	}

	updateQuestionData(q_id, key, value) {
		// returns just the matching, updated, question
		let retQ;
		var newQuestionsData = this.state.questionsData.filter(questionData => {
			if (questionData.id === q_id) {
				retQ = questionData;
				questionData[key] = value;
			}
			return questionData;
		});
		this.setState({ questionsData: newQuestionsData });
		return retQ;
	}

	getQuestionData(q_id) {
		let retArr = this.state.questionsData.filter(questionData => {
			if (questionData.id === q_id) {
				return questionData;
			}
		});

		if (retArr.length === 1) {
			return retArr[0];
		} else {
			console.log("WebFF: getQuestionData(" + q_id + ") returned " + retArr.length + " questions");
			//TODO: throw error
			return null;
		}

	}

	questionChangeSystemCallback(Q) {
		// checks for action string, executes any actions, and then updates current state of questionsData

		//HARDCODE for demo:
		// special questions do special things
		if (Q.props.id === "settings_paper") {
			this.setState({ usePaper: Q.state.value });
			this.handleSystemMenuItemClicked("Settings");
		}

		// console.log("questionChangeSystemCallback: Q: ", Q);

		// save updated value to state:
		let updatedQuestionData = this.getQuestionDataWithUpdatedValue(Q);
		// console.log("questionChangeSystemCallback: updatedQuestionData: ", updatedQuestionData);

		this.setState({ questionsData: updatedQuestionData });

		// check if there are additional actions needed based on the actionOptions in this question, Q
		if (Q == null) {
			//TODO: throw error
			console.log("questionChangeSystemCallback required field, question, is null");
		}

		if (Q.props.actions) {
			let { actions } = Q.props;
			let qval = Q.state.value;
			let commandString = actions[qval];
			if (commandString) {
				let actionsToDo = commandString.split('&');
				actionsToDo.forEach((action) => {
					this.actionExecuter(action);
				});
			}
		}
		this.buildRoutesAndRenderPages(); //performance
	}

	buildRoutesAndRenderPages = () => {   //TODO:  move to the render function -- currently needs to be called any time content on question pages needs to be modified.  Suspect structural issue with a nested setState inside the questionPage
		var newRoutesAndPages = (
			<Switch> {/* only match ONE route at a time */}
				<Route exact path="/" render={() => <h1>HOME</h1>} />
				
				<Route path="/Dashboard" render={() => <Dashboard
					appBarTextCB={this.setAppBarText}
					text="Dashboard"
					navControl={this.navigationControl}
					globalState={this.state}
				/>} />
				<Route render={() => <QuestionPage
					appBarTextCB={this.setAppBarText}
					tabName={this.props.location.pathname.slice(1)}
					navControl={this.navigationControl}
					systemCB={this.questionChangeSystemCallback}
					questionsData={this.state.questionsData}
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

		this.setState({ routesAndPages: newRoutesAndPages }, () => this.collectRunAndPropagateSamplePointData());
	};

	collectRunAndPropagateSamplePointData() {
		//FIXME:  This overwrites values in the table if any exist //TODO: check current value and insert
		let numSampPoints = null;
		//console.log(this.state);
		if (this.state.itemsLoaded.includes('questionsData')) {
			numSampPoints = this.getQuestionData("samplingPoints").value;
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

			this.updateQuestionData("EWI_samples_table", "value", newVal);
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


		// this.putDBInfo("generatedQuestions",
		// [{"testName":"Joe", "id":"smelven"},
		// {"testName":"Mark", "id":"tensie"},
		// {"testName":"Jan", "id":"oldest"}]
		// );

		if (menuText === "Test Connection") {
			console.log("Testing  of new Question")
			let newQuestion = {
				"id": "ThisisThefirstID",
				"label": "Station Number",
				"XMLValue": "",
				"type": "Text",
				"tabName": "Add Station",
				"value": "",
				"layoutGroup": "Basic",
				"width_xs": 5,
				"width_lg": 5
			}
			this.updateDBInfo("customQuestions", newQuestion, (resp) => console.log("EXPECT NULL: Response: ", resp));

			let patchData =
				{ "id": "CSN", "testName": "SMister" }
			this.updateDBInfo("customQuestions/" + patchData.id, patchData, (resp) => console.log("EXPECT FULL OBJECT: Response: ", resp));



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
			});
			//open the dialog
			this.handleDialogOpen();
		} else {
			//TODO: ERR
			console.log(menuText + " is not yet implemented");
		}

	}

	render() {
		const { classes } = this.props;

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
					stateChangeHandler={this.questionChangeSystemCallback}
					globalState={this.state} />
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