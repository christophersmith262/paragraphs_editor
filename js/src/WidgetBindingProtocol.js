var Drupal = require('drupal'),
  $ = require('jquery'),
  WidgetBinder = require('widget-binder');

module.exports = WidgetBinder.PluginInterface.SyncProtocol.extend({

  constructor: function(module_name) {
    this.moduleName = module_name;
  },

  send: function(type, data, resolver) {
    if (type == 'FETCH_SCHEMA') {
      this._get(data, resolver);
    }
    else {
      this._sendAjaxCommand(data, resolver);
    }
  },

  _sendAjaxCommand: function(command, resolver) {

    if (!command.command) {
      return;
    }
    var path = '/ajax/paragraphs-editor/' + command.command;

    if (command.targetContext) {
      path += '/' + command.targetContext;
    }

    if (command.sourceContext) {
      path += '/' + command.sourceContext;
    }

    if (command.itemId) {
      path += '/' + command.itemId;
    }

    if (!_.isUndefined(command.widget)) {
      path += '/' + command.widget;
    }

    if (command.type) {
      path += '/' + command.type;
    }

    var params = [];
    for (var key in command.settings) {
      params.push('settings[' + key + ']=' + command.settings[key]);
    }
    params.push('module=' + this.moduleName);
    path += '?' + params.join('&');

    var ajax = Drupal.ajax({
      url: path,
      progress: {
        message: "",
      },
    });

    ajax.options.data['editorContext'] = command.editorContext.id;

    if (command.editableContexts) {
      _.each(command.editableContexts, function(context) {
        var key = 'editableContexts';
        key += '[' + context.ownerId + ']';
        key += '[' + context.fieldId + ']';
        ajax.options.data[key] = context.id;
      });
    }

    if (command.command == 'duplicate' && command.edits) {
      _.each(command.edits, function(edit, contextId) {
        ajax.options.data['edits[' + contextId + ']'] = edit;
      })
    }

    var complete = ajax.options.complete;

    ajax.options.complete = function (xmlhttprequest, status) {
      complete.call(ajax.options, xmlhttprequest, status);
      Drupal.ajax.instances.splice(ajax.instanceIndex, 1);
    }

    ajax.execute();
  },

  _get: function(id, resolver) {
    $.get('/ajax/paragraphs-editor/schema/' + id, '', function(response) {
      resolver.resolve(response);
    });
  }
});
