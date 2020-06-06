//
//  EditProfileScreen.swift
//  feedless
//
//  Created by Rogerio Chaves on 01/06/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct EditProfileScreen: View {
    @EnvironmentObject var context : Context
    @EnvironmentObject var profiles : Profiles
    @EnvironmentObject var keyboard : KeyboardResponder
    @EnvironmentObject var imageLoader : ImageLoader
    @EnvironmentObject var router : Router
    @State var showImagePicker : Bool = false
    @State var uiImage : UIImage? = nil
    @State var name = "";
    @State var bio = "";
    @State var profile : FullProfile? = nil

    func keyboardOffset() -> CGFloat {
        return [keyboard.currentHeight - 85, CGFloat(0)].max()! * -1
    }

    func imageOrFallback() -> some View {
        if
            let uiImage = self.uiImage,
            let resizedImage = Utils.resizeImage(image: uiImage, targetSize: CGSize(width: 256, height: 256))
        {
            return AnyView(
                Image(uiImage: resizedImage)
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 48, height: 48)
                .border(Styles.darkGray)
            )
        }

        let url = profile != nil ? Utils.avatarUrl(profile: profile!.profile) : nil
        return AnyView(
            AsyncImage(url: url, imageLoader: self.imageLoader)
            .aspectRatio(contentMode: .fit)
            .frame(width: 48, height: 48)
            .border(Styles.darkGray)
        )
    }

    func updateResult() -> some View {
        if case .loading = self.profiles.updateResult {
            return AnyView(Text("Updating..."))
        } else if case .error(_) = self.profiles.updateResult {
            return AnyView(Text("Error updating profile"))
        }
        return AnyView(EmptyView())
    }

    var body: some View {
        UITableView.appearance().backgroundColor = UIColor.secondarySystemBackground
        
        return VStack(spacing: 0) {
            Form {
                Section(header: Text("Avatar")) {
                    HStack {
                        imageOrFallback()

                        Button("Choose from library..."){
                           self.showImagePicker = true
                        }
                    }
                }
                Section(header: Text("Details")) {
                    HStack {
                        Text("Name")
                        Spacer()
                        TextField("", text: $name)
                            .multilineTextAlignment(.trailing)
                    }
                    HStack {
                        Text("Bio")
                        Spacer()
                        TextField("Bio", text: $bio)
                            .multilineTextAlignment(.trailing)
                    }
                }
            }
            VStack(spacing: 0) {
                Divider()
                    .padding(0)
                HStack {
                    updateResult()
                    Spacer()
                    PrimaryButton(text: "Save") {
                        self.profiles.updateProfile(context: self.context, name: self.name, bio: self.bio, image: self.uiImage) {
                            self.router.changeRoute(to: self.router.profileScreen)
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 10)
                .background(Color(Styles.uiWhite))
            }
            .offset(y: keyboardOffset())
            .animation(.easeOut(duration: 0.16))
        }
        .edgesIgnoringSafeArea(.horizontal)
        .navigationBarTitle("Edit Profile")
        .onAppear {
            if let id = self.context.ssbKey?.id, case .success(let profile) = self.profiles.profiles[id] {
                self.profile = profile
                self.name = profile.profile.name ?? ""
                self.bio = profile.description ?? ""
            }
            self.router.updateNavigationBarColor(route: .profile)
        }
        .sheet(isPresented: self.$showImagePicker) {
            PhotoCaptureView(showImagePicker: self.$showImagePicker, uiImage: self.$uiImage)
        }
    }
}

struct EditProfileScreen_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            NavigationMenu {
                EditProfileScreen()
            }
                .environmentObject(Samples.context())
                .environmentObject(Router())
                .environmentObject(KeyboardResponder())
                .environmentObject(Profiles())
        }
    }
}
