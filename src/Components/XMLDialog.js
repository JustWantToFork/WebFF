import React from 'react';
import PropTypes from 'prop-types';
// import { withRouter } from 'react-router-dom';
import { withStyles } from '@material-ui/core/styles';
// import { Link } from 'react-router-dom';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import { saveFile } from '../Utils/FileHandling';
import Typography from '@material-ui/core/Typography';
import Divider from '@material-ui/core/Divider';
import { PHP_FILE_LOCATION, SEDLOGIN_SUCCESS_MESSAGE } from '../Utils/Constants';


const styles = theme => ({
  root: {
    flexGrow: 1,
  },
  paper: {
    padding: theme.spacing.unit * 2,
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
});

class XMLDialog extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      showStatus: false,
      statusMessage: "",
      showSedLOGINQs: false,
      pw: "",
      SedLOGINprojectID: ""
    };

    this.saveXML = this.saveXML.bind(this);
    this.saveAllXML = this.saveAllXML.bind(this);
    this.pushXMLToSedLOGIN = this.pushXMLToSedLOGIN.bind(this);
    this.updateStatus = this.updateStatus.bind(this);
    this.updateStatus = this.updateStatus.bind(this);
  }

  componentDidMount() {
    // this.props.appBarTextCB('SedWE Dashboard');
  }

  saveXML() {
    let d = new Date();
    //TODO: get the eventName
    saveFile("SedFF_" + d.getFullYear() + (d.getMonth() + 1) + d.getDate() + d.getHours() + d.getMinutes() + "_SedLOGINCompatible.xml", this.props.getSedLOGINcompatibleXML());
    return;
  }


  saveAllXML() {
    let d = new Date();
    //TODO: get the eventName
    let allData = this.props.getSedLOGINcompatibleXML();
    let curEvt = this.props.globalState[this.props.globalState.curSamplingEventName];
    Object.keys(curEvt).map((key) => {
      if (key === 'questionsValues') {
        Object.keys(curEvt[key]).map((QVkey) => {
          allData += "\n<" + QVkey + ">" + curEvt[key][QVkey] + "</" + QVkey + ">";
          return null;
        });
      } else {
        allData += "\n<" + key + ">" + curEvt[key] + "</" + key + ">";
      }
      return null;
    })
    saveFile("SedFF_" + d.getFullYear() + (d.getMonth() + 1) + d.getDate() + d.getHours() + d.getMinutes() + "_AllData.xml", allData);
    return;
  }

  pushXMLToSedLOGIN(p_id, pass) {

    this.updateStatus("Attempting to push to SedLOGIN... this may take a minute\n");

    const SLCXML = this.props.getSedLOGINcompatibleXML();
    const DEBUG = true;
    const API = PHP_FILE_LOCATION + 'sedLOGINPush.php';
    let username = this.props.username.split('@')[0];
    const query = "user=" + username + "&pw=" + encodeURIComponent(pass) + "&p_id=" + p_id + "&xml=" + encodeURIComponent(SLCXML);


    let URI = API;
    if (DEBUG) console.log("Function: fetchDBInfo @ " + URI);
    fetch(URI, {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/x-www-form-urlencoded', // <-- Specifying the Content-Type
      }),
      body: query
    })
      .then(function (response) {
        if (response.status >= 200 && response.status < 300) {
          return response.text()
        }
        throw new Error(response.statusText)
      })
      .then((response) => {
        this.updateStatus(response);
        if (response.includes(SEDLOGIN_SUCCESS_MESSAGE)) {
          this.props.setShippedStatus(null, true);
        }
        //TODO: add loader
      })
      .catch(error => console.log("Error fetching " + URI + "(" + query + ")\n" + error));
  }

  pushToSedLOGINClickHandler = () => {

    this.setState({ showSedLOGINQs: true })
  }

  doneClickHandler = () => {
    this.props.handleXMLDialogClose(() => {
      setTimeout(() => {
        this.setState({
          showStatus: false,
          statusMessage: "",
          showSedLOGINQs: false
        });
      }, 250);

    });
  }

  sedLoginSubmitHandler = () => {
    this.setState({ showStatus: true });
    this.setState({ showSedLOGINQs: false })
    this.pushXMLToSedLOGIN(this.state.SedLOGINprojectID, this.state.pw);
  }

  passwordChangeHandler = (e) => {
    this.setState({ pw: e.target.value });
  }
  projectIDChangeHandler = (e) => {
    this.setState({ SedLOGINprojectID: e.target.value });
  }

  updateStatus(textToAdd) {
    this.setState({ statusMessage: this.state.statusMessage + textToAdd });
  }

  render() {
    const { classes } = this.props;

    return (
      <Dialog
        open={this.props.isOpen}
        onClose={this.props.handleXMLDialogClose}
        aria-labelledby="form-dialog-title"
      >
        <DialogTitle id="form-dialog-title">Save SedLOGIN-compatible XML</DialogTitle>
        <DialogContent>


          <Grid justify="space-around" container spacing={24}>
            <Grid item xs={12}>
              <DialogContentText>
                Save the current event to your computer, or directly upload it to SedLOGIN
            </DialogContentText>
            </Grid>
            <Grid item xs={4} >
              <Paper style={{ height: '90%' }} className={classes.paper}><Button style={{ height: '100%' }} onClick={this.saveAllXML}>Save All Event Data to XML file</Button></Paper>
            </Grid>
            <Grid item xs={4} >
              <Paper style={{ height: '90%' }} className={classes.paper}><Button style={{ height: '100%' }} onClick={this.saveXML}>Save SedLOGIN-compatible XML file</Button></Paper>
            </Grid>
            <Grid item xs={4} >
              <Paper style={{ height: '90%' }} className={classes.paper}><Button style={{ height: '100%' }} onClick={this.pushToSedLOGINClickHandler}>Push event to SedLOGIN</Button></Paper>
            </Grid>

            {this.state.showStatus ? <Grid item xs={12}>
              <Paper className={classes.paper}>
                <TextField
                  margin="dense"
                  id="name"
                  label="Status"
                  rows={8}
                  fullWidth
                  multiline
                  value={this.state.statusMessage}
                />
              </Paper>
            </Grid> : null}

            {this.state.showSedLOGINQs ?
              <React.Fragment>
                <Divider></Divider>
                <Grid item xs={12}><Typography>{this.props.username}, enter the SedLOGIN project ID and your Active Directory password</Typography></Grid>
                <Grid item xs={4}>
                  <TextField
                    margin="dense"
                    id="sedLOGINProjectID"
                    label="SedLOGIN Project ID"
                    fullWidth
                    onChange={this.projectIDChangeHandler}
                    value={this.state.SedLOGINprojectID}
                  />
                </Grid>
                <Grid item xs={8}>
                  <TextField
                    margin="dense"
                    type="password"
                    id="ADPass"
                    label="Active Directory Password"
                    onChange={this.passwordChangeHandler}
                    fullWidth
                    value={this.state.pw}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    margin="dense"
                    onClick={this.sedLoginSubmitHandler}
                  >Submit to SedLOGIN</Button>
                </Grid>
              </React.Fragment>
              : null}

          </Grid>



        </DialogContent>
        <DialogActions>
          <Button onClick={this.doneClickHandler} color="primary">
            Done
            </Button>
        </DialogActions>
      </Dialog>
    );
  }
}

XMLDialog.propTypes = {
  classes: PropTypes.object.isRequired,
  appBarTextCB: PropTypes.func
};

export default withStyles(styles, { withTheme: true })(XMLDialog);