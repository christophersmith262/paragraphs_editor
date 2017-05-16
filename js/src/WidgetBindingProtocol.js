var Drupal = require('drupal'),
  WidgetBinder = require('widget-binder');

module.exports = WidgetBinder.PluginInterface.SyncProtocol.extend({

  send: function(type, data, settings, resolver) {
    if (type == 'FETCH_SCHEMA') {
      this._get(data, resolver);
    }
    else {
      this._sendAjaxCommand(data, settings, resolver);
    }
  },

  _sendAjaxCommand: function(command, settings, resolver) {

    if (!command.command) {
      return;
    }
    var path = '/ajax/paragraphs-editor/' + command.command;

    if ('targetContext' in command) {
      path += '/' + command.targetContext;
    }

    if ('sourceContext' in command) {
      path += '/' + command.sourceContext;
    }

    if ('paragraph' in command) {
      path += '/' + command.paragraph;
    }

    if ('widget' in command) {
      path += '/' + command.widget;
    }

    if ('bundleName' in command) {
      path += '/' + command.bundleName;
    }

    var params = [];
    for (var key in settings) {
      params.push('settings[' + key + ']=' + settings[key]);
    }
    path += '?' + params.join('&');

    var ajax = Drupal.ajax({
      url: path,
      progress: {
        message: "",
      },
    });

    ajax.options.data['editorContext'] = this._editorContext.get('id');

    if (command.edits) {
      ajax.options.data['nested_contexts'] = _.keys(command.edits);
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
