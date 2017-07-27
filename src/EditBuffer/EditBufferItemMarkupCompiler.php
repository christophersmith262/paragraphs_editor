<?php

namespace Drupal\paragraphs_editor\EditBuffer;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Render\RendererInterface;
use Drupal\Core\Render\Element;
use Drupal\field\Entity\FieldConfig;
use Drupal\paragraphs_editor\EditorCommand\WidgetBinderData;
use Drupal\paragraphs_editor\EditorCommand\CommandContextFactoryInterface;
use Drupal\paragraphs_editor\EditorCommand\CommandContextInterface;

class EditBufferItemMarkupCompiler implements EditBufferItemMarkupCompilerInterface {

  protected $viewBuilder;
  protected $renderer;
  protected $contextFactory;

  public function __construct(EntityTypeManagerInterface $entity_type_manager, RendererInterface $renderer, CommandContextFactoryInterface $context_factory) {
    $this->viewBuilder = $entity_type_manager->getViewBuilder('paragraph');
    $this->renderer = $renderer;
    $this->contextFactory = $context_factory;
  }

  public function compile(CommandContextInterface $context, EditBufferItemInterface $item, $view_mode = NULL, $langcode = NULL) {
    $paragraph = $item->getEntity();

    // Attach the view builder that will decorate the view with information
    // needed to make nested paragraphs into nested editables.
    $view =  $this->viewBuilder->view($paragraph, $view_mode, $langcode);
    $session = new EditBufferItemMarkupCompilerSession($this->contextFactory, $item);
    $this->processElement($view, $session);

    // Render the rendered markup for the view.
    $markup = $this->renderer->render($view);
    $session->cleanup();

    $data = new WidgetBinderData();
    $data->addModels('context', $session->getContexts());
    $item_model = [
      'contextId' => $context->getContextString(),
      'markup' => $markup,
      'type' => $paragraph->bundle(),
      'fields' => $session->getFieldMap(),
    ];
    if ($context->getAdditionalContext('command') == 'insert') {
      $item_model['insert'] = 'true';
    }
    $data->addModel('editBufferItem', $paragraph->uuid(), $item_model);
    return $data;
  }

  public function buildView(array $build) {
    $session = $build['#paragraphs_editor_session'];
    $path = $build['#paragraphs_editor_path'];

    foreach (Element::children($build) as $field_name) {

      // Only apply inline editing to nested paragraphs_editor enabled fields.
      $info = $build[$field_name];
      $field_definition = FieldConfig::loadByName($info['#entity_type'], $info['#bundle'], $info['#field_name']);

      $base_path = $path;
      if ($base_path) {
        $base_path[] = [
          'type' => 'widget',
          'uuid' => $build['#paragraph']->uuid(),
        ];
      }

      if ($field_definition->getThirdPartySetting('paragraphs_editor', 'enabled')) {
        $context = $session->getContext($field_definition->id(), $info['#object']->id(), $info['#object']->uuid());

        // Mark the field render array with an editor context so the
        // preprocessor can decorate it with the right attributes.
        $build[$field_name]['#paragraphs_editor_context'] = $context->getContextString();
        $edit_path = $base_path;
        $edit_path[] = [
          'type' => 'field',
          'name' => $field_definition->getName(),
          'context' => $context->getContextString(),
        ];

        $session->mapPath($edit_path);
      }
      else {
        $edit_path = $base_path;
        $edit_path[] = [
          'type' => 'field',
          'name' => $field_definition->getName(),
        ];
        foreach (Element::children($build[$field_name]) as $delta) {
          $theme = !empty($build[$field_name][$delta]['#theme']) ? $build[$field_name][$delta]['#theme'] : '';
          if ($theme == 'paragraph') {
            $this->processElement($build[$field_name][$delta], $session, $edit_path);
          }
        }
      }
    }

    return $build;
  }

  public function preprocessField(array &$variables) {
    if (!empty($variables['element']['#paragraphs_editor_context'])) {
      $context_string = $variables['element']['#paragraphs_editor_context'];
      foreach ($variables['items'] as $delta => $item) {
        $variables['items'][$delta]['attributes']->addClass('editable-paragraph-field');
        $variables['items'][$delta]['attributes']->setAttribute('data-context', $context_string);
        $variables['items'][$delta]['content'] = '';
      }
    }
  }

  protected function processElement(&$element, $session, $path = []) {
    $element['#pre_render'][] = array($this, 'buildView');
    $element['#paragraphs_editor_session'] = $session;
    $element['#paragraphs_editor_path'] = $path;
  }
}
