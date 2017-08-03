<?php

namespace Drupal\paragraphs_editor\Plugin\dom_processor\data_processor;

$recursion_count = 0;

use Drupal\dom_processor\DomProcessor\SemanticDataInterface;
use Drupal\dom_processor\DomProcessor\DomProcessorResultInterface;
use Drupal\dom_processor\Plugin\dom_processor\DataProcessorInterface;
use Drupal\paragraphs_editor\Plugin\dom_processor\ParagraphsEditorDomProcessorPluginTrait;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * @DomProcessorDataProcessor(
 *   id = "paragraphs_editor_renderer",
 *   label = "Paragraphs Editor Renderer"
 * )
 */
class ParagraphsEditorRenderer implements DataProcessorInterface, ContainerFactoryPluginInterface {
  use ParagraphsEditorDomProcessorPluginTrait;

  public function __construct($field_value_manager, array $elements, $entity_type_manager, $renderer) {
    $this->initializeParagraphsEditorDomProcessorPlugin($field_value_manager, $elements);
    $this->viewBuilder = $entity_type_manager->getViewBuilder('paragraph');
    $this->storage = $entity_type_manager->getStorage('paragraph');
    $this->renderer = $renderer;
  }

  /**
   * {@inheritdoc}
   */
  static public function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $container->get('paragraphs_editor.field_value.manager'),
      $container->getParameter('paragraphs_editor.field_value.elements'),
      $container->get('entity_type.manager'),
      $container->get('renderer')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function process(SemanticDataInterface $data, DomProcessorResultInterface $result) {
    if ($this->is($data, 'widget')) {
      $entity = $data->get('paragraph.entity');
      if ($entity) {
        $markup = $this->render($data, $entity);
        $result->replaceWithHtml($data, $markup);
        return $result;
      }
    }
    else {
      return $result;
    }
  }

  protected function render($data, $entity) {
    $view_mode = $data->get('settings.view_mode');
    $langcode = $data->get('langcode');
    $to_process = [];
    $to_render = [];
    $uuid = $entity->uuid();
    $render_cache = &drupal_static(__CLASS__ . '::' . __FUNCTION__, []);

    if (empty($render_cache[$uuid])) {
      array_push($to_process, $entity);
      array_push($to_render, $entity);
      while ($entity = array_shift($to_process)) {
        foreach ($entity->getFields() as $items) {
          $field_definition = $items->getFieldDefinition();

          if ($this->fieldValueManager->isParagraphsField($field_definition)) {
            if ($this->fieldValueManager->isParagraphsEditorField($field_definition)) {
              $wrapper = $this->fieldValueManager->wrapItems($items);
              foreach ($wrapper->getReferencedEntities() as $child_entity) {
                if (preg_match('/' . $child_entity->uuid() . '/', $wrapper->getMarkup())) {
                  array_push($to_render, $child_entity);
                  $to_process[] = $child_entity;
                }
              }
            }
            else {
              foreach ($this->getReferencedEntities($data, $items) as $child_entity) {
                $to_process[] = $child_entity;
              }
            }
          }
        }
      }

      while ($entity = array_pop($to_render)) {
        $view = $this->viewBuilder->view($entity, $view_mode, $langcode);
        $render_cache[$entity->uuid()] = $this->renderer->render($view);
      }
    }

    return $render_cache[$uuid];
  }
}
