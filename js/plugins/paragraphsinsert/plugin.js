/**
 * @file
 * Drupal Image plugin.
 *
 * This alters the existing CKEditor image2 widget plugin to:
 * - require a data-entity-type and a data-entity-uuid attribute (which Drupal
 *   uses to track where images are being used)
 * - use a Drupal-native dialog (that is in fact just an alterable Drupal form
 *   like any other) instead of CKEditor's own dialogs.
 *
 * @see \Drupal\editor\Form\EditorImageDialog
 *
 * @ignore
 */

(function ($, Drupal, CKEDITOR) {

  'use strict';

  CKEDITOR.plugins.add('paragraphsinsert', {
    icons: 'paragraphsinsert',
    hidpi: false,
    requires: [ "widget" ],
    beforeInit: function(editor) {
      // We need to register the paragraphs-ckeditor-paragraph element with the
      // CKEDITOR DOM model or it will get confused and add wayward <p> tags.
      // Here we will register the paragraphs-ckeditor-paragraph tag to behave
      // like a div tag.
      CKEDITOR.dtd['paragraphs-ckeditor-paragraph'] = CKEDITOR.dtd.div;
      for (var tagName in CKEDITOR.dtd) {
        if (CKEDITOR.dtd[tagName].div) {
          CKEDITOR.dtd[tagName]['paragraphs-ckeditor-paragraph'] = 1;
        }
      }
      CKEDITOR.dtd.body['paragraphs-ckeditor-paragraph'] = 1;
    },
    init: function (editor) {
      var $paragraphsCKEditor = $(editor.element.$).closest('.paragraphs-ckeditor');

      // Don't allow commands that would alter the internal paragraph structure
      // to be applied to DOM tree branches that contain
      // paragraphs-ckeditor-paragraph elements.
      editor.on('beforeCommandExec', function(e) {
        var selection = editor.getSelection();
        if (selection) {
          var ranges = selection.getRanges();
          for (var i in ranges) {
            if (ranges[i].getBoundaryNodes) {
              if (searchBranch(ranges[i], 'paragraphs-ckeditor-paragraph')) {
                var undoable = true;
                if (typeof e.data.command.canUndo !== 'undefined') {
                  undoable = e.data.command.canUndo;
                }
                if (undoable) {
                  e.data = null;
                  return false;
                }
              }
            }
          }
        }
      });

      // Hide contents of the paragraphs-ckeditor-paragraph tag in source view
      // mode.
      editor.on('toDataFormat', function(e) {
        var node = e.data.dataValue;
        var i;
        var filter = new CKEDITOR.htmlParser.filter({
          elements: {
            "paragraphs-ckeditor-paragraph": function(element) {
              for (i in element.children) {
                var child = element.children[i];
                child.remove();
              }
            }
          }
        });
        node.filterChildren(filter);
      }, null, null, 14);

      // Provides a command for creating an "insert paragraph" dialog.
      editor.addCommand('paragraphsinsert', {
        allowedContent: 'paragraphs-ckeditor-paragraph[*]',
        requiredContent: 'paragraphs-ckeditor-paragraph[*]',
        exec: function() {
          $paragraphsCKEditor.paragraphsCKEditor('insert-paragraph');
        },
      });

      // Provides the ui component for the "insert paragraph" command.
      editor.ui.addButton('ParagraphsInsert', {
        label: 'Embed',
        command: 'paragraphsinsert',
        icon: this.path + 'icons/component.png',
      });

      // Define the CKEditor widget that represents a paragraph in the editor.
      editor.widgets.add('ParagraphsCKEditorWidget', {
        allowedContent: true,
        requiredContent: 'paragraphs-ckeditor-paragraph[*]',
        template: '<paragraphs-ckeditor-paragraph></paragraphs-ckeditor-paragraph>',
        upcast: function (element) {
          return element.name == 'paragraphs-ckeditor-paragraph';
        },
        init: function() {
          // When a paragraph preview widget is first being initialized, we get
          // its associated model from the jQuery plugin and produce a view with
          // the widget element and render it.
          var paragraphPreview = $paragraphsCKEditor.paragraphsCKEditor('get-paragraph', {
            uuid: $(this.element.$).attr('data-paragraph-uuid')
          });
          if (paragraphPreview) {
            var view = new Drupal.paragraphs_ckeditor.ParagraphCKEditorPreviewView({
              "model": paragraphPreview,
              "$paragraphsCKEditor": $paragraphsCKEditor,
              "el": this.element.$,
            });
            view.render();
          }
        }
      });

      /**
       * Helper function for seeing if a selector exists in a DOM tree branch.
       */
      function searchBranch(range, selector) {
        // comman represents the root node of the branch to be searched.
        // boundaries represents the the breadth of the search.
        var common = range.getCommonAncestor().$;
        var boundaries = range.getBoundaryNodes();

        // Get the start and end of the search boundaries.
        var start = boundaries.startNode.$;
        var end = boundaries.endNode.$;

        // Traverse start and end up the tree so they occur at the same level in
        // the tree (this will be level n+1 if common is at level n).
        while (start && start.parentNode !== common) {
          start = start.parentNode;
        }
        while (end && end.parentNode !== common) {
          end = end.parentNode;
        }

        var child;
        var in_range = false;
        for (child = common.firstChild; child; child = child.nextSibling) {
          // We aren't in range until we reach the start node (since the start
          // node may have siblings to the left.)
          if (child === start) {
            in_range = true;
          }

          // If we are within the search reach and find something that matched
          // the selector, we're done.
          if (in_range && $(child).find(selector).length) {
            return true;
          }

          // We reached the end of the branch didn't find anything.
          if (child === end) {
            break;
          }
        }

        return false;
      }
    }
  });

})(jQuery, Drupal, CKEDITOR);
