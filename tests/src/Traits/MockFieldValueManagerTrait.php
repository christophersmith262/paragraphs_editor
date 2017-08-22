<?php

namespace Drupal\Tests\paragraphs_editor\Traits;

use Drupal\paragraphs_editor\EditorFieldValue\FieldValueManagerInterface;
use Drupal\paragraphs_editor\EditorFieldValue\FieldValueWrapperInterface;
use Prophecy\Argument;

trait MockFieldValueManagerTrait {

  protected function fieldValueManagerDefaults() {
    return [
      'paragraphs_fields' => [
        'field_tabs',
        'field_content',
      ],
      'paragraphs_editor_fields' => [
        'field_content',
      ],
      'wrapper_options' => [
      ],
    ];
  }

  protected function createFieldValueManager(array $options = []) {
    $options += $this->fieldValueManagerDefaults();
    $prophecy = $this->prophesize(FieldValueManagerInterface::CLASS);

    $prophecy->getReferencedEntities(Argument::any())->will(function ($args, $prophecy) {
      return $args[0]->referencedEntities();
    });

    $prophecy->isParagraphsField(Argument::any())->will(function($args, $prophecy) use ($options) {
      return in_array($args[0]->getName(), $options['paragraphs_fields']);
    });

    $prophecy->isParagraphsEditorField(Argument::any())->will(function($args, $prophecy) use ($options) {
      return in_array($args[0]->getName(), $options['paragraphs_editor_fields']);
    });

    $prophecy_factory = $this;
    $prophecy->wrapItems(Argument::cetera())->will(function($args, $prophecy) use ($prophecy_factory, $options) {
      $uuid = $args[0]->getEntity()->uuid();
      $field_id = $args[0]->getFieldDefinition()->id();
      return $prophecy_factory->createFieldValueWrapper($options['wrapper_options'][$uuid][$field_id]);
    });

    $prophecy->getElement(Argument::cetera())->will(function($args) use($options) {
      if (!empty($options[$args[0]])) {
        return $options[$args[0]];
      }
    });

    $prophecy->getElement(Argument::cetera())->will(function($args) use($options) {
      if (!empty($options['elements'][$args[0]])) {
        return $options['elements'][$args[0]];
      }
      else {
        return [
          'tag' => $args[0],
          'attributes' => [],
          'selector' => '.' . $args[0],
          'flag' => '_flag_' . $args[0],
        ];
      }
    });

    $prophecy->getAttributeName(Argument::cetera())->will(function($args) use($options) {
      return 'data-' . trim($args[1], '<>');
    });

    $prophecy->getSelector(Argument::cetera())->will(function($args) use($options) {
      if (!empty($options['elements'][$args[0]]['selector'])) {
        return $options['elements'][$args[0]]['selector'];
      }
      else {
        return '.' . trim($args[0], '<>');
      }
    });

    return $prophecy->reveal();
  }

  protected function createFieldValueWrapper(array $options = []) {
    $prophecy = $this->prophesize(FieldValueWrapperInterface::CLASS);
    $prophecy->getMarkup()->willReturn($options['markup']);
    return $prophecy->reveal();
  }
}
