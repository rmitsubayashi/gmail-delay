// 1. call initialSetup() which will send all your emails to a hidden label
// 2. from the app script UI set triggers for the function moveDelayedEmailsToInbox()
//    to decide when you want emails to be moved to your inbox

function moveDelayedEmailsToInbox() {

  var delayedEmailLabels = GmailApp.getUserLabelByName("delayed");
  if (delayedEmailLabels == null) {
    throw Error("You need to create the label first");
  }

  var threads = delayedEmailLabels.getThreads();

  GmailApp.moveThreadsToInbox(threads);
  GmailApp.markThreadsUnread(threads);
  delayedEmailLabels.removeFromThreads(threads);
  
}

function initialSetup() {
  _createLabelForDelayedEmails();
  _createFilterForIncomingEmails([]);
}

function _createFilterForIncomingEmails(emailAddressesToExclude) {
  _removeCurrentFilter();
  var newFilter = Gmail.newFilter();
  var filterCriteria = Gmail.newFilterCriteria();
  _addFilterToExcludeEmailAddresses(filterCriteria, emailAddressesToExclude);
  _addFilterToExcludeVerificationEmails(filterCriteria);
  newFilter.filterCriteria = filterCriteria;
  var filterAction = Gmail.newFilterAction();
  _addActionToMarkAsRead(filterAction);
  _addActionToMarkAsDelayed(filterAction);

  newFilter.criteria = filterCriteria;
  newFilter.action = filterAction;

  var currentAuthenticatedUserSpecialValue = "me";
  var createdFilter = Gmail.Users.Settings.Filters.create(newFilter, currentAuthenticatedUserSpecialValue);
  _saveCurrentFilter(createdFilter);
}

function _removeCurrentFilter() {
  var scriptProperties = PropertiesService.getScriptProperties();
  var mostRecentFilterId = scriptProperties.getProperty("mostRecentFilterId");
  if (mostRecentFilterId == null) {
    return;
  }
  if (!_filterExists(mostRecentFilterId)) {
    return;
  }
  Gmail.Users.Settings.Filters.remove("me", mostRecentFilterId);
}

function _filterExists(mostRecentFilterId) {
  var filterList = Gmail.Users.Settings.Filters.list("me");
  var filter = filterList.filter.find(function (f) {
    return f.id == mostRecentFilterId;
  });

  return filter != undefined;
}

function _saveCurrentFilter(newFilter) {
  var scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty("mostRecentFilterId", newFilter.id);
}

function _createLabelForDelayedEmails() {
  var label = GmailApp.getUserLabelByName("delayed");

  if (label == null) {
    var newLabel = Gmail.newLabel();
    // can't figure out how to access the enum here
    // https://developers.google.com/gmail/api/reference/rest/v1/users.labels
    // so hard-coding enum value for now
    newLabel.labelListVisibility = "LABEL_HIDE";
    newLabel.name = "delayed";
    var currentAuthenticatedUserSpecialValue = "me";
    Gmail.Users.Labels.create(newLabel, currentAuthenticatedUserSpecialValue);
  }
}

function _addFilterToExcludeEmailAddresses(filterCriteria, emailAddressesToExclude) {
  if (emailAddressesToExclude.length == 0) {
    return;
  }
  var formattedEmailAddressesToExclude = emailAddressesToExclude.map(_addMinusInFront);
  var excludeEmailAddressesFilter = formattedEmailAddressesToExclude.join(" AND ");
  filterCriteria.from = excludeEmailAddressesFilter;
}

function _addFilterToExcludeVerificationEmails(filterCriteria) {
  filterCriteria.subject = "-{confirm verify password confirmation verification 認証 パスワード}"
}

function _addActionToMarkAsRead(filterAction) {
  filterAction.removeLabelIds = ["INBOX", "UNREAD"];
}

function _addActionToMarkAsDelayed(filterAction) {
  var currentAuthenticatedUserSpecialValue = "me";
  var delayedLabel = Gmail.Users.Labels.list(currentAuthenticatedUserSpecialValue).labels.find(_isDelayedLabel);
  if (delayedLabel == undefined) {
    throw Error("You need to create the label first");
  }
  filterAction.addLabelIds = [delayedLabel.id];
}

function _isDelayedLabel(label) {
  return label.name == "delayed";
}

function _addMinusInFront(string) {
  return "-" + string;
}
