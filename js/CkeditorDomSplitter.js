/**
 * @file
 * Provides an object for splitting a CKEditor DOM tree at a given text node.
 */

/**
 * An object for partitioning a CKEDITOR DOM tree.
 */
var CkeditorDomSplitter = function ($ckeditor_field) {

  /**
   * Partitions a CKEDITOR dom tree based on a selection range.
   *
   * This will split the tree where the range *starts*.
   *
   * @param range
   * @return
   */
  this.partitionTree = function(range) {
    var partitioned = {
    };

    // Set up generic lists for storing children to be added as we traverse
    // up the dom tree.
    //
    // The choice of data structure here corrosponds to the order in which we
    // read siblings from the canonical tree.
    var left_child_stack = new Array();
    var right_child_queue = new Array();

    // The beginning of the range is used as the starting point in the tree, we
    // build a left-hand tree by copying all nodes to the "left" of the pivot
    // node, and vice-versa for the right-hand tree.
    var pivot = getPivot(range.startContainer);

    // If the range starts in a text node then we need to split the text apart,
    // otherwise we assume the pivot is an empty container element.
    if (typeof pivot !== 'undefined' && pivot.type === CKEDITOR.NODE_TEXT) {
      var split = splitText(pivot, range.startOffset);
      if (split.left.length) {
        left_child_stack.push(new CKEDITOR.dom.text(split.left));
      }
      if (split.right.length) {
        right_child_queue.push(new CKEDITOR.dom.text(split.right));
      }
      pivot = pivot.getParent();
    }

    // Traverse up the dom tree to build left-hand and right-hand partitions one
    // level at a time.
    while (pivot) {

      // Add children for the left-hand partition.
      var left_root = pivot.clone(false);
      var left;
      while (left = left_child_stack.pop()) {
        left_root.append(left);
      }

      // Add children for the right-hand partition.
      var right_root = pivot.clone(false);
      var right;
      while (right = right_child_queue.shift()) {
        right_root.append(right);
      }

      // Build a stack of children to add to left-hand partition.
      pushNodeElement(left_child_stack, left_root);
      left = pivot;
      while (left = left.getPrevious()) {
        pushNodeElement(left_child_stack, left.clone(true));
      }

      // Build a queue of children to add to the right-hand partition.
      right = pivot;
      pushNodeElement(right_child_queue, right_root);
      while (right = right.getNext()) {
        pushNodeElement(right_child_queue, right.clone(true));
      }

      pivot = pivot.getParent();
    }

    var left = readTree(left_root);
    if (left) {
      partitioned.left = createTextValue(left);
    }

    var right = readTree(right_root);
    if (right) {
      partitioned.right = createTextValue(right);
    }

    return partitioned;
  }

  var createTextValue = function (value) {
    var values = {};
    values[$ckeditor_field.attr('data-paragraphs-ckeditor-field')] = {
      0: {
        value: value,
        filter: $ckeditor_field.find('.filter-list').val(),
      },
    };
    return values;
  }

  /**
   * Splits a CKEDITOR.dom.text node into two nodes at offset.
   *
   * @param element
   * @param offset
   * @return
   */
  var splitText = function (element, offset) {
    var left = element.clone(false);
    var right = element.clone(false);
    var source = element.getText();
    var split = {
      left: new String(),
      right: new String(),
    };
    var i;
    for (i = 0 ; i < source.length; i++) {
      if (i < offset) {
        split.left = split.left.concat(source.charAt(i));
      }
      else {
        split.right = split.right.concat(source.charAt(i));
      }
    }
    return split;
  }

  /**
   * Determines if a node is an empty container.
   *
   * @param element
   * @return
   */
  var isNodeEmpty = function (element) {
    var empty = true;
    if (typeof element !== 'undefined') {
      if (element.type === CKEDITOR.NODE_TEXT || element.getChildCount()) {
        empty = false;
      }
    }
    return empty;
  }

  /**
   * Pushes node to a list if the element is not empty.
   *
   * @param list
   * @param element
   */
  var pushNodeElement = function (list, element) {
    if (!isNodeEmpty(element)) {
      list.push(element);
    }
  }

  /**
   * Reads a CKEDITOR.dom.* tree as an html string.
   *
   * @param root
   * @return
   */
  var readTree = function (root) {
    var html = '';
    if (root) {
      var body_list = root.getElementsByTag('body');
      if (body_list.count()) {
        html = body_list.getItem(0).getHtml();
      }
      return html;
    }
  }

  /**
   * Given the beginning of a selection range, drill down to the text element
   * where the selection starts.
   * 
   * @param element
   * @return
   */
  var getPivot = function (element) {
    if (element.type == CKEDITOR.NODE_TEXT) {
      return element;
    }
    else {
      var children = element.getChildren();
      for (var i = 0; i < element.getChildCount(); i++) {
        var pivot = getPivot(children.getItem(i));
        if (pivot.type == CKEDITOR.NODE_TEXT) {
          return pivot;
        }
      }
    }
    return element;
  }

}
