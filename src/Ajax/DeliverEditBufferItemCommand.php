<?php

namespace Drupal\paragraphs_editor\Ajax;

use Drupal\Core\Ajax\CommandInterface;
use Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface;
use Drupal\field\Entity\FieldConfig;
use Drupal\Core\Render\Element;

class DeliverEditBufferItemCommand implements CommandInterface {

  protected $item;
  protected $insert;
  protected $contextString;

  public function __construct($target_context, EditBufferItemInterface $item, $insert = FALSE) {
    $this->context = $target_context;
    $this->item = $item;
    $this->insert = $insert;
  }

  public function render() {
    $paragraph = $this->item->getEntity();
    $this->fillEditableParagraphs($paragraph);
    $view_builder = \Drupal::entityTypeManager()->getViewBuilder('paragraph');
    $storage = \Drupal::entityTypeManager()->getStorage('paragraph');
    $view =  $view_builder->view($paragraph, 'full');
    $view['#pre_render'][] = array($this, 'buildView');
    $markup = \Drupal::service('renderer')->render($view);
    return array(
      'command' => 'paragraphs_editor_data',
      'context' => $this->context->getContextString(),
      'editBufferItem' => array(
        'id' => $paragraph->uuid(),
        'context' => $this->context->getContextString(),
        'isNew' => $paragraph->isNew(),
        'insert' => $this->insert,
        'markup' => $markup,
        'inlineEdits' => $this->item->getInlineEdits(),
      ),
    );
  }

  public function buildView(array $build) {
    $context_factory = \Drupal::service('paragraphs_editor.command.context_factory');

    foreach (Element::children($build) as $field_name) {
      $info = $build[$field_name];
      $field_definition = FieldConfig::loadByName($info['#entity_type'], $info['#bundle'], $info['#field_name']);

      if ($field_definition->getThirdPartySetting('paragraphs_editor', 'enabled')) {
        $context = $context_factory->create($info['#entity_type'], $info['#object']->id(), $field_definition->id(), array());
        $build[$field_name]['#paragraphs_editor_context'] = $context->getContextString();
      }
      else {
        foreach (Element::children($build[$field_name]) as $delta) {
          if ($build[$field_name][$delta]['#theme'] == 'paragraph') {
            $build[$field_name][$delta]['#pre_render'][] = array($this, 'buildView');
          }
        }
      }
    }
    return $build;
  }

  protected function fillEditableParagraphs($paragraph) {
    foreach ($paragraph->getFieldDefinitions() as $field_definition) {
      if ($field_definition->getType() == 'entity_reference_revisions') {
        $field_name = $field_definition->getName();
        if ($field_definition->getThirdPartySetting('paragraphs_editor', 'enabled')) {
          $text_bundle = $field_definition->getThirdPartySetting('paragraphs_editor', 'text_bundle');
          $paragraph->{$field_name}[0] = array(
            'entity' => \Drupal::service('entity_type.manager')->getStorage('paragraph')->create(array(
              'type' => $text_bundle,
            )),
          );
        }
        else {
          foreach ($paragraph->{$field_name} as $field_item) {
            $this->fillEditableParagraphs($field_item->entity);
          }
        }
      }
    }
  }
}
