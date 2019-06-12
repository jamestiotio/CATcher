import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MatDialog } from '@angular/material';
import { JsonParseErrorDialogComponent } from './json-parse-error-dialog/json-parse-error-dialog.component';
const { ipcRenderer } = require('electron');
import {
  trigger,
  state,
  style,
  animate,
  transition
} from '@angular/animations';

/**
 * Indicates all the elements that make up a Profile.
 */
export interface Profile {
  profileName: string;
  username: string;
  password: string;
  encodedText: string;
}

@Component({
  selector: 'app-profiles',
  templateUrl: './profiles.component.html',
  styleUrls: ['./profiles.component.css'],
  animations: [
    // animation triggers go here
    trigger('triggerFileInput', [
      state('normal', style({})),
      state('pressed', style({
        color: 'orange'
      })),
      transition('normal => pressed', [
        animate('0.25s ease')
      ]),
      transition('pressed => normal', [
        animate('0.25s ease')
      ])
    ])
  ]
})
export class ProfilesComponent implements OnInit {

  private readonly ANIMATION_DURATION: number = 250;

  profiles: Profile[] = undefined; // List of profiles taken from profiles.json
  blankProfile: Profile = {profileName: '', password: '', username: '', encodedText: ''}; // A blank profile to reset values
  animationActivated = false;

  private readonly fs = require('fs');

  private readonly APPLICATION_AND_SUBDIRECTORIES: RegExp = /[\/\\]+[^\/\\]+\.(exe|app|AppImage|asar).*/g;
  private readonly PROFILES_FILE_NAME = 'profiles.json';
  private filePath: string;

  @Output() selectedProfile: EventEmitter<Profile> = new EventEmitter<Profile>();
  @Output() profileDataPrompter: EventEmitter<{}> = new EventEmitter<{}>();

  profilesData = {
    'visible': false,
    'fileName': null,
    'fileDirectory': null
  };

  constructor(public errorDialog: MatDialog) { }

  ngOnInit() {
    const path = require('path');
    const temp = ipcRenderer.sendSync('synchronous-message', 'getDirectory');
    this.filePath = path.join(
        temp.replace(this.APPLICATION_AND_SUBDIRECTORIES, ''),
        this.PROFILES_FILE_NAME);
    this.readProfiles();
  }

  /**
   * Activates the button selection animation and opens the file selector.
   * @param fileInput - OS default file selector.
   */
  fileSelectorInitiation(fileInput: HTMLInputElement): void {
    this.animationActivated = true;
    setTimeout(() => {
      this.animationActivated = false;
      fileInput.click();
    }, this.ANIMATION_DURATION);
  }

  /**
   * Reads the user selected file
   * @param fileInput - OS default file selector.
   */
  fileSelected(fileInput: HTMLInputElement): void {
    this.filePath = (fileInput.files[0].path);
    this.readProfiles();
  }

  /**
   * Processes the selected profiles JSON file.
   */
  readProfiles(): void {
    // Informing Parent Component (Auth) of file selection
    this.profilesData.fileName = this.PROFILES_FILE_NAME;
    this.profilesData.fileDirectory = this.filePath.split(this.PROFILES_FILE_NAME)[0];
    this.profilesData.visible = !this.userProfileFileExists(this.filePath);
    this.profileDataPrompter.emit(this.profilesData);

    try {
      this.profiles = JSON.parse(this.fs.readFileSync(this.filePath))['profiles'];
    } catch (e) {
      console.log(e);
      return;
    }

    setTimeout(() => {
      if (!this.isValid(this.profiles)) {
        this.profiles = undefined;
        this.openErrorDialog();
        this.selectProfile(this.blankProfile);
      }
    });
  }

  /**
   * Makes Error dialog visible to the user.
   */
  openErrorDialog(): void {
    this.errorDialog.open(JsonParseErrorDialogComponent);
  }

  /**
   * Checks that every profile is correctly defined in the array of profiles.
   * @param profiles - Array of profiles sourced from profiles.json
   */
  isValid(profiles: Profile[]): boolean {
    if (profiles === undefined) {
      return false;
    }
    return profiles.filter(profile => (profile.profileName === undefined || profile.encodedText === undefined))
        .length === 0;
  }

  /**
   * Returns true if the file indicated by the filePath exists.
   * @param filePath - Path of file to check.
   */
  userProfileFileExists(filePath: string): boolean {
    return this.fs.existsSync(filePath);
  }

  /**
   * Sends the selected profile information to listening component.
   * @param profile - Profile selected by user.
   */
  selectProfile(profile: Profile): void {
    this.selectedProfile.emit(profile);
  }
}
