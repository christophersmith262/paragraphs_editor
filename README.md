## Synopsis

This module provides an ajax / javascript framework for editing paragraph fields with WYSIWYG editors. It also contains the paragraphs_ckeditor submodule, which supports CKEditor integration for paragraph fields.

## Motivation

The paragraphs module is a great way to break out design systems into a structured component library for content authors. The default widget provided by paragraphs treats content fields as structured lists of components. This works well in cases where the paragraph field is being used to represent an ordered listing of content.

Often times, we use paragraphs to build "body field" content, that is not easily representable by a simple list of components. In these cases, workarounds for controlling layout and text management usually introduce additional bloat in the field structure, and large amounts of back end code to handle different contexts in which a component might be used. Additionally, each section of text content is usually treated as its own component in the field, making re-arranging or splitting apart text cumbersome.

This module provides a field widget, field formatter, and text filter for paragraph fields that allows authors to work within a free-flowing WYSIWYG, while also allowing them to create paragraphs in-context and on the fly.

## Installation

By default the paragraphs_editor module simply provides an API. If you are looking to integrate with the default Drupal 8 WYSIWYG, enable paragraphs_ckeditor and view the installtion instructions for that module.
