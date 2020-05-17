//
//  Profile.swift
//  feedless
//
//  Created by Rogerio Chaves on 15/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct ProfileScreen : View {
    let id : String?
    @EnvironmentObject var context : Context
    @EnvironmentObject var profiles : Profiles
    @EnvironmentObject var imageLoader : ImageLoader
    @State private var selection = 0

    init(id : String?) {
        self.id = id
    }

    func getId() -> String? {
        if self.id != nil {
            return self.id
        }
        return context.ssbKey?.id
    }

    func profileView(_ profile: FullProfile) -> some View {
        ScrollView(.vertical) {
            VStack(alignment: .leading) {
                HStack(spacing: 20) {
                    AsyncImage(url: Utils.avatarUrl(profile: profile.profile), imageLoader: self.imageLoader)
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 128, height: 128)
                        .border(Styles.darkGray)

                    VStack(alignment: .leading) {
                        Text(profile.profile.name ?? "unknown")
                            .font(.largeTitle)
                            .bold()

                        Text(profile.profile.description ?? "")
                    }
                }
                Divider()
                PostsList(profile.posts)
            }
        }
    }

    func profileResult() -> some View {
        if let id = self.getId(), let profile = profiles.profiles[id] {
            switch profile {
            case .loading:
                return AnyView(Text("Loading...")
                    .navigationBarTitle("Profile", displayMode: .inline))
            case let .success(profile):
                return AnyView(profileView(profile)
                    .navigationBarTitle(Text(profile.profile.name ?? "Profile"), displayMode: .inline)
                )
            case let .error(message):
                return AnyView(Text(message)
                    .navigationBarTitle("Profile", displayMode: .inline))
            }
        } else {
            return AnyView(Text("Loading...")
                .navigationBarTitle("Profile", displayMode: .inline))
        }
    }

    var body: some View {
        profileResult()
            .onAppear() {
                if let id = self.id {
                    self.profiles.load(context: self.context, id: id)
                }
            }
    }
}

struct Profile_Previews: PreviewProvider {
    static var previews: some View {
        ProfileScreen(id: nil)
            .environmentObject(Samples.context())
            .environmentObject(Samples.profiles())
            .environmentObject(ImageLoader())
    }
}
