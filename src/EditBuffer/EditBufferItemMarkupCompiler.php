<?php

namespace Drupal\paragraphs_editor\EditBuffer;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Render\RendererInterface;
use Drupal\Core\Render\Element;
use Drupal\field\Entity\FieldConfig;
use Drupal\paragraphs_editor\EditorCommand\CommandContextFactoryInterface;

class EditBufferItemMarkupCompilerSession {

  protected $contextFactory;
  protected $item;
  protected $paragraphContexts = array();

  public function __construct(CommandContextFactoryInterface $context_factory, EditBufferItemInterface $item) {
    $this->contextFactory = $context_factory;
    $this->item = $item;
    $this->paragraphContexts = $item->getParagraphContexts();
  }

  public function getContext($field_config_id, $entity_id, $uuid) {
    // We regenerate the context each time the field item is rendered to
    // prevent issues with form caching. This means we have to map existing
    // edits fro mthe old context to the new one.
    if (!empty($this->paragraphContexts[$uuid])) {
      list($field_config_id, $widget_build_id, $entity_id) = $this->contextFactory->parseContextString($this->paragraphContexts[$uuid]);
      $from_context = $this->contextFactory->create($field_config_id, $entity_id, array(), $widget_build_id);
      $context = $this->contextFactory->regenerate($from_context);
      $this->item->mapContext($from_context->getContextString(), $context->getContextString());
    }
    else {
      $context = $this->contextFactory->create($field_config_id, $entity_id);
    }

    return $context;
  }
}

class EditBufferItemMarkupCompiler {

  protected $viewBuilder;
  protected $renderer;
  protected $contextFactory;

  public function __construct(EntityTypeManagerInterface $entity_type_manager, RendererInterface $renderer, CommandContextFactoryInterface $context_factory) {
    $this->viewBuilder = $entity_type_manager->getViewBuilder('paragraph');
    $this->renderer = $renderer;
    $this->contextFactory = $context_factory;
  }

  public function compile(EditBufferItemInterface $item, $view_mode = 'full') {
    $paragraph = $item->getEntity();

    // Attach the view builder that will decorate the view with information
    // needed to make nested paragraphs into nested editables.
    $view =  $this->viewBuilder->view($paragraph, $view_mode);
    $item->resetContextMap();
    $session = new EditBufferItemMarkupCompilerSession($this->contextFactory, $item);
    $this->processElement($view, $session);

    // Render the rendered markup for the view.
    $markup = $this->renderer->render($view);
    return $markup;
  }

  public function buildView(array $build) {
    $session = $build['#paragraphs_editor_session'];

    foreach (Element::children($build) as $field_name) {

      // Only apply inline editing to nested paragraphs_editor enabled fields.
      $info = $build[$field_name];
      $field_definition = FieldConfig::loadByName($info['#entity_type'], $info['#bundle'], $info['#field_name']);
      if ($field_definition->getThirdPartySetting('paragraphs_editor', 'enabled')) {
        $context = $session->getContext($field_definition->id(), $info['#object']->id(), $info['#object']->uuid());

        // Mark the field render array with an editor context so the
        // preprocessor can decorate it with the right attributes.
        $build[$field_name]['#paragraphs_editor_context'] = $context->getContextString();
      }
      else {
        foreach (Element::children($build[$field_name]) as $delta) {
          if ($build[$field_name][$delta]['#theme'] == 'paragraph') {
            $this->processElement($build[$field_name][$delta], $session);
          }
        }
      }
    }

    return $build;
  }

  protected function processElement(&$element, $session) {
    $element['#pre_render'][] = array($this, 'buildView');
    $element['#paragraphs_editor_session'] = $session;
  }
}
