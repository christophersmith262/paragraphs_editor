<?php

namespace Drupal\paragraphs_editor\Form;

use Drupal\Core\Ajax\AjaxResponse;
use Drupal\Core\Entity\ContentEntityForm;
use Drupal\Core\Entity\EntityManagerInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Extension\ModuleHandlerInterface;
use Drupal\Core\Form\FormStateInterface;
use Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface;
use Drupal\paragraphs_editor\EditorCommand\CommandContextInterface;

/**
 * The form that is shown for editing paragraph entities in ckeditor.
 *
 * This is basically just the core content entity form with a few overrides to
 * ajaxify the experience and integrate with the delivery provider plugin
 * system.
 */
class ParagraphEntityForm extends ContentEntityForm {

  /**
   * The context the editor command is being executed in.
   *
   * @var Drupal\paragraphs_editor\EditorCommand\CommandContextInterface
   */
  protected $context;

  /**
   * The buffer item being edited by this form.
   *
   * @var Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface
   */
  protected $bufferItem;

  /**
   * Creates a ParagraphEntityForm object.
   *
   * @param Drupal\paragraphs_editor\EditorCommand\CommandContextInterface $context
   *   The context of the command that is invoking this form.
   * @param Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface $item
   *   An editor item (wrapped paragraph entity) to show the edit form for.
   * @param Drupal\Core\Extension\ModuleHandlerInterface $module_handler
   *   The module handler service.
   * @param Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager
   *   The entity type manager service.
   * @param Drupal\Core\Entity\EntityManagerInterface $entity_manager
   *   The entity manager service.
   */
  public function __construct(CommandContextInterface $context, EditBufferItemInterface $item,
    ModuleHandlerInterface $module_handler, EntityTypeManagerInterface $entity_type_manager, EntityManagerInterface $entity_manager) {

    // The ContentEntityForm class actually has a whole bunch of hidden
    // dependendencies. They are injected by core via setters, however we
    // explicitly use constructor injection here to make them clear. I realize
    // this is ugly, but at least its clear (I hope).

    // The code we rely on still uses the old (deprecated) EntityManager. We
    // will rely on the standard EntityTypeManager within this class.
    parent::__construct($entity_manager);

    // Inject dependencies for parent classes.
    $this->setEntityTypeManager($entity_type_manager);
    $this->setModuleHandler($module_handler);
    $this->setEntity($item->getEntity());

    // Set dependencies for this class.
    $this->context = $context;
    $this->bufferItem = $item;
  }

  /**
   * {@inheritdoc}
   */
  public function form(array $form, FormStateInterface $form_state) {
    $form = parent::form($form, $form_state);

    $nested_contexts = $form_state->getValue('paragraphs_editor_nested_contexts');
    if (!$nested_contexts) {
      $nested_contexts = $this->context->getAdditionalContext('nested_contexts');
    }
    else {
      $nested_contexts = unserialize($nested_contexts);
    }
    if (!$nested_contexts) {
      $nested_contexts = array();
    }

    // Ensure that any paragraph fields that are going to be nested editable
    // have entities in their reference fields.
    $editable_contexts = array();
    $copy_nested_contexts = $nested_contexts;
    $this->fillEditableParagraphs($this->entity, $copy_nested_contexts, $editable_contexts);

    $form['paragraphs_editor_nested_contexts'] = array(
      '#type' => 'hidden',
      '#default_value' => serialize($nested_contexts),
    );

    $form['paragraphs_editor_editable_contexts'] = array(
      '#type' => 'hidden',
      '#default_value' => serialize($editable_contexts),
    );

    return $form;
  }

  /**
   * {@inheritdoc}
   */
  public function save(array $form, FormStateInterface $form_state) {
    // Save the changes to the editor buffer.
    $this->bufferItem->overwrite($this->entity);
    $this->bufferItem->save();

    // Make properties available to the static ajax handler.
    $form_state->setTemporaryValue(['paragraphs_editor', 'item'], $this->bufferItem);
    $form_state->setTemporaryValue(['paragraphs_editor', 'context'], $this->context);
  }

  /**
   * {@inheritdoc}
   */
  protected function actions(array $form, FormStateInterface $form_state) {
    $actions = parent::actions($form, $form_state);

    // Make the default entity save button submit via ajax.
    $actions['submit']['#ajax'] = array(
      'callback' => array(get_class($this), 'ajaxSubmit'),
    );

    // Provide a cancel link for users to cancel the edit operation.
    $url = $this->context->createCommandUrl('cancel');
    $actions['cancel'] = array(
      '#type' => 'button',
      '#value' => $this->t('Cancel'),
      '#weight' => 10,
      '#ajax' => array(
        'url' => $url,
        'options' => $url->getOptions(),
      ),
    );

    unset($actions['delete']);

    return $actions;
  }

  /**
   * Handles submissions via ajax.
   *
   * @param array $form
   *   The complete form render array.
   * @param Drupal\Core\Form\FormStateInterface $form_state
   *   The associated form state.
   *
   * @return Drupal\Core\Ajax\AjaxResponse
   *   An ajax response object that delivers a rendered paragraph.
   */
  static public function ajaxSubmit(array $form, FormStateInterface $form_state) {
    // Retrieve class mambers needed to build a response.
    $item = $form_state->getTemporaryValue(['paragraphs_editor', 'item']);
    $delivery = $form_state->getTemporaryValue(['paragraphs_editor', 'context'])->getPlugin('delivery_provider');

    $editable_contexts = unserialize($form_state->getValue('paragraphs_editor_editable_contexts'));
    if ($editable_contexts) {
      $item->setParagraphContexts($editable_contexts);
    }

    // Create a response that includes the rendered paragraph and signal that
    // the ajax workflow is completed.
    $response = new AjaxResponse();
    $delivery->render($response, $item);
    $delivery->close($response);

    return $response;
  }

  protected function fillEditableParagraphs($paragraph, array &$available_contexts, array &$inline_contexts) {
    foreach ($paragraph->getFieldDefinitions() as $field_definition) {
      if ($field_definition->getType() == 'entity_reference_revisions') {
        $field_name = $field_definition->getName();
        if ($field_definition->getThirdPartySetting('paragraphs_editor', 'enabled')) {
          if (!isset($paragraphs{$field_name}[0])) {
            $text_bundle = $field_definition->getThirdPartySetting('paragraphs_editor', 'text_bundle');
            $paragraph->{$field_name}[0] = array(
              'entity' => \Drupal::service('entity_type.manager')->getStorage('paragraph')->create(array(
                'type' => $text_bundle,
              )),
            );
          }
          $context_string = array_shift($available_contexts);
          if ($context_string) {
            $inline_contexts[$paragraph->uuid()] = $context_string;
          }
        }
        else {
          foreach ($paragraph->{$field_name} as $field_item) {
            if ($field_item->entity) {
              $this->fillEditableParagraphs($field_item->entity, $available_contexts, $inline_contexts);
            }
          }
        }
      }
    }
  }
}
