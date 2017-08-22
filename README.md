[![Build Status](https://travis-ci.org/christophersmith262/paragraphs_editor.svg?branch=8.x)](https://travis-ci.org/christophersmith262/paragraphs_editor)

## Synopsis

This module provides an ajax / javascript framework for editing paragraph
fields with WYSIWYG editors. Since this module only provides an API. To use
Editor integration on a site, you might want to start with the
[paragraphs_ckeditor](https://github.com/christophersmith262/paragraphs_ckeditor) project.

## Motivation

The paragraphs module is a great way to break out design systems into a
structured component library for content authors. The default widget provided by
paragraphs treats content fields as structured lists of components. This works
well in cases where the paragraph field is being used to represent an ordered
listing of content.

Often times, we use paragraphs to build "body field" content, that is not easily
representable by a simple list of components. In these cases, workarounds for
controlling layout and text management usually introduce additional bloat in the
field structure, and large amounts of back end code to handle different contexts
in which a component might be used. Additionally, each section of text content
is usually treated as its own component in the field, making re-arranging or
splitting apart text cumbersome.

This module provides a field widget, field formatter, and text filter for
paragraph fields that allows authors to work within a free-flowing WYSIWYG,
while also allowing them to create paragraphs in-context and on the fly.

## Resources

 * [Documentation](http://paragraphs-editor.readthedocs.io/en/latest): Contains documentation for extending and
   updating paragraphs_editor.
 * [paragraphs_ckeditor](https://github.com/christophersmith262/paragraphs_ckeditor): Provides integration with the core CKEditor
   implementation.
 * [Drupal Project](https://www.drupal.org/sandbox/christophersmith262/2491637): The Drupal project page for this module.
